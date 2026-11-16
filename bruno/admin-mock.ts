import { randomBytes } from "node:crypto";
import { z } from "zod";
import { productDto } from "../src/app/warehouse-data/catalog/catalogDto";
import { orderDto } from "../src/app/warehouse-data/orders/orderDto";
import { warehouseDto } from "../src/app/warehouse-data/warehouses/warehouseDto";
import {
	type AuditEvent,
	accountUserUpdateSchema,
	auditSchema,
	systemSchema,
	usersSchema,
} from "../src/app/administration/model/shipmentAudit";
import {
	type GuestLink,
	guestLinkInputSchema,
} from "../src/app/administration/model/guestLink.dto";
import { type GuestSection, guestSectionSchema } from "../src/domain/shipment";
import { guestShipmentSchema } from "../src/app/shipment-portal/model/guestShipment.dto";
import { workingShipmentSchema } from "../src/app/warehouse/shipment-management/model/shipment.dto";
import { sampleShipment } from "./shipment-samples";

export type MockStore = Map<string, unknown>;
const base = "/api/v1";
const notFound = () =>
	problem(404, "SHIPMENT_NOT_FOUND", "Отгрузка недоступна");
const privateHeaders = { "Cache-Control": "no-store" };

function problem(status: number, code: string, message: string) {
	return Response.json(
		{ error: { code, message } },
		{ status, headers: privateHeaders },
	);
}

function shipmentFor(
	store: MockStore,
	warehouse: string,
	orderId: string,
	includeInbound = false,
) {
	const warehousePath = `${base}/warehouses/${warehouse}`;
	const orderPath = `${warehousePath}/orders/${orderId}`;
	const order = orderDto.safeParse(store.get(orderPath));
	if (!order.success || (!includeInbound && order.data.kind !== "outbound"))
		return undefined;
	const saved = workingShipmentSchema.safeParse(
		store.get(`${orderPath}/shipment`),
	);
	if (saved.success) return saved.data;
	const location = warehouseDto.safeParse(store.get(warehousePath));
	const products = z
		.object({ items: z.array(productDto) })
		.safeParse(store.get(`${warehousePath}/products`));
	if (!location.success || !products.success) return undefined;
	return sampleShipment(location.data, order.data, products.data.items);
}

type MockLink = {
	link: GuestLink;
	warehouse: string;
	store: MockStore;
	token: string;
};

const linkSamples: {
	status: GuestLink["status"];
	sections: GuestSection[];
}[] = [
	{
		status: "active",
		sections: ["milestones", "calendar"],
	},
	{
		status: "active",
		sections: ["warehouse", "calendar"],
	},
	{
		status: "active",
		sections: ["items", "documents"],
	},
	{ status: "active", sections: ["items"] },
	{ status: "expired", sections: ["milestones"] },
	{
		status: "revoked",
		sections: [...guestSectionSchema.options],
	},
];

const invalidJson = Symbol("invalid JSON");

async function readMutation(request: Request): Promise<unknown> {
	if (request.method !== "POST" && request.method !== "PATCH") return undefined;
	try {
		return await request.json();
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		return invalidJson;
	}
}

export function createAdminMock({ seedLinks = false } = {}) {
	const links = new Map<string, MockLink>();
	const attempts = new WeakMap<
		MockStore,
		Map<string, { body: string; id: string }>
	>();
	const initialized = new WeakMap<MockStore, Set<string>>();
	function addSamples(store: MockStore, warehouse: string) {
		const seeded = initialized.get(store) ?? new Set();
		if (!seedLinks || seeded.has(warehouse)) return;
		const { items } = z
			.object({ items: z.array(orderDto) })
			.parse(store.get(`${base}/warehouses/${warehouse}/orders`));
		const outbound = items.filter(({ kind }) => kind === "outbound");
		const statuses = [
			"active",
			"shipped",
			"completed",
			"awaiting_load",
			"draft",
			"cancelled",
		];
		const examples = statuses.flatMap((status) => {
			const order = outbound.find((item) => item.status === status);
			return order ? [order] : [];
		});
		const orders = [...new Set([...examples, ...outbound])];
		if (!orders.length) return;
		initialized.set(store, seeded);
		seeded.add(warehouse);
		for (const [index, sample] of linkSamples.entries()) {
			const order = orders[index];
			if (!order) continue;
			const id = crypto.randomUUID();
			const days = sample.status === "expired" ? -1 : index + 2;
			links.set(id, {
				link: {
					...sample,
					name: order.counterparty_text,
					id,
					revision: 0,
					order_ids: [order.id],
					created_at: new Date(
						Date.now() - (index + 1) * 86400000,
					).toISOString(),
					expires_at: new Date(Date.now() + days * 86400000).toISOString(),
				},
				warehouse,
				store,
				token: randomBytes(32).toString("base64url"),
			});
		}
	}

	async function handle(
		request: Request,
		account: MockStore,
		sandbox?: MockStore,
		publicOrigin?: string,
	): Promise<Response | undefined> {
		const { pathname } = new URL(request.url);
		const bearer = request.headers.get("Authorization");
		const { method } = request;

		if (pathname.startsWith(`${base}/public/shipments`)) {
			const entry = [...links.values()].find(
				(item) => `Bearer ${item.token}` === bearer,
			);
			if (!entry) return;
			const { link, warehouse, store } = entry;
			if (link.status !== "active" || Date.parse(link.expires_at) <= Date.now())
				return notFound();
			const sections = new Set(link.sections);
			const orders = link.order_ids.flatMap((id) => {
				const shipment = shipmentFor(store, warehouse, id);
				if (!shipment) return [];
				const { order, items, plan, actual, milestones, documents } = shipment;
				return [
					guestShipmentSchema.parse({
						id,
						sections: link.sections,
						order,
						...(sections.has("warehouse") && { warehouse: shipment.warehouse }),
						...(sections.has("items") && { items }),
						...(sections.has("calendar") && {
							plan,
							actual,
							calendar_items: items.map(({ order_line_id, name, sku }) => ({
								order_line_id,
								name,
								sku,
							})),
						}),
						...(sections.has("milestones") && { milestones }),
						...(sections.has("documents") && {
							documents: documents.filter((item) => item.published),
						}),
					}),
				];
			});
			if (pathname === `${base}/public/shipments` && method === "GET")
				return Response.json({ orders }, { headers: privateHeaders });
			const download = pathname.match(/\/documents\/([^/]+)\/download$/);
			if (
				method === "GET" &&
				download &&
				orders.some((order) =>
					order.documents?.some(
						(item) => item.id === decodeURIComponent(download[1] ?? ""),
					),
				)
			) {
				return new Response("Тестовая накладная", {
					headers: {
						...privateHeaders,
						"Content-Type": "text/plain",
						"Content-Disposition": "attachment; filename=shipment.txt",
					},
				});
			}
			return notFound();
		}

		const workingOrder = pathname.match(
			/^\/api\/v1\/warehouses\/([^/]+)\/orders\/([^/]+)\/shipment$/,
		);
		if (
			seedLinks &&
			workingOrder &&
			method === "GET" &&
			(sandbox || bearer === "Bearer bruno-account-token")
		) {
			const [, warehouse, orderId] = workingOrder;
			const shipment = shipmentFor(
				sandbox ?? account,
				decodeURIComponent(warehouse ?? ""),
				decodeURIComponent(orderId ?? ""),
				true,
			);
			if (shipment) return Response.json(shipment, { headers: privateHeaders });
			return notFound();
		}

		const monitoring = pathname.match(
			/^\/api\/v1\/(sandbox\/)?admin\/(shipment-audit|shipment-system)$/,
		);
		if (seedLinks && monitoring && method === "GET") {
			const [, sandboxPrefix, resource] = monitoring;
			const store = sandboxPrefix ? sandbox : account;
			if (!bearer || !store)
				return problem(401, "UNAUTHORIZED", "Войдите в систему");
			if (!sandboxPrefix && bearer !== "Bearer bruno-account-token")
				return problem(403, "FORBIDDEN", "Недостаточно прав");
			const params = new URL(request.url).searchParams;
			const audit = auditSchema.parse(
				store.get(`${base}/${sandboxPrefix ?? ""}admin/shipment-audit`),
			);
			if (resource === "shipment-audit") {
				const offset = Math.max(0, Number(params.get("offset")) || 0);
				const limit = Math.min(
					200,
					Math.max(1, Number(params.get("limit")) || 50),
				);
				return Response.json(
					{
						items: audit.items.slice(offset, offset + limit),
						total: audit.total,
					},
					{ headers: privateHeaders },
				);
			}

			const system = systemSchema.parse(store.get(pathname));
			const from = params.get("from");
			const to = params.get("to");
			const recent_errors = system.recent_errors.filter(
				({ occurred_at }) =>
					(!from || occurred_at >= from) && (!to || occurred_at < to),
			);
			const warehouseId = params.get("warehouse_id");
			const orderId = params.get("order_id");
			const shipment =
				warehouseId && orderId
					? shipmentFor(store, warehouseId, orderId, true)
					: undefined;
			const order_diagnostics =
				shipment && warehouseId && orderId
					? {
							warehouse_id: warehouseId,
							order_id: orderId,
							order_number: shipment.order.number,
							warehouse_name: shipment.order.warehouse_name,
							time_zone: shipment.order.time_zone,
							updated_at: shipment.order.updated_at,
							recent_events: audit.items.filter(
								(event) =>
									event.warehouse_id === warehouseId &&
									event.order_id === orderId,
							),
						}
					: null;
			return Response.json(
				{
					...system,
					error_count: recent_errors.length,
					recent_errors,
					order_diagnostics,
				},
				{ headers: privateHeaders },
			);
		}

		const admin = pathname.match(
			/^\/api\/v1\/(sandbox\/)?admin\/(?:warehouses\/([^/]+)\/shipment-links(?:\/([^/]+))?|(shipment-users)(?:\/([^/]+))?)$/,
		);
		if (!admin) return;
		const [, sandboxPrefix, warehouseId, linkId, users, userId] = admin;
		const store = sandboxPrefix ? sandbox : account;
		if (!bearer || !store)
			return problem(401, "UNAUTHORIZED", "Войдите в систему");
		if (!sandboxPrefix && bearer !== "Bearer bruno-account-token")
			return problem(403, "FORBIDDEN", "Недостаточно прав");
		const body = await readMutation(request);
		if (body === invalidJson)
			return problem(422, "INVALID_JSON", "Проверьте данные запроса");
		if (users) {
			const path = `${base}/${sandboxPrefix ?? ""}admin/shipment-users`;
			const result = usersSchema.safeParse(store.get(path));
			if (!result.success) return;
			const items = result.data.items;
			if (!userId && method === "GET")
				return Response.json(result.data, { headers: privateHeaders });
			const user = items.find(
				(item) => item.id === decodeURIComponent(userId ?? ""),
			);
			if (user?.kind !== "account") return notFound();
			if (method === "DELETE") {
				if (!sandboxPrefix && user.id === "user-sandbox-admin")
					return problem(403, "SELF_DELETE", "Нельзя удалить свой аккаунт");
				if (
					user.revision === undefined ||
					request.headers.get("If-Match") !== `"${user.revision}"`
				) {
					return problem(
						409,
						"STALE_REVISION",
						"Обновите список пользователей и попробуйте снова",
					);
				}
				store.set(path, {
					...result.data,
					items: items.filter((item) => item.id !== user.id),
				});
				return new Response(null, { status: 204, headers: privateHeaders });
			}
			if (method !== "PATCH")
				return problem(405, "METHOD_NOT_ALLOWED", "Операция недоступна");
			const update = accountUserUpdateSchema.safeParse(body);
			if (!update.success)
				return problem(422, "INVALID_USER", "Проверьте поля пользователя");
			if (update.data.revision !== user.revision)
				return problem(
					409,
					"STALE_REVISION",
					"Откройте карточку пользователя заново",
				);
			if (
				items.some(
					(item) =>
						item.kind === "account" &&
						item.id !== user.id &&
						item.login.toLowerCase() === update.data.login.toLowerCase(),
				)
			) {
				return problem(409, "LOGIN_IN_USE", "Этот логин уже используется");
			}
			const catalog = result.data.permission_catalog;
			const assignments = update.data.warehouses.map((entry) => {
				const previous = user.warehouses.find(
					(assignment) => assignment.warehouse_id === entry.warehouse_id,
				);
				const warehouse = warehouseDto.safeParse(
					store.get(`${base}/warehouses/${entry.warehouse_id}`),
				);
				if (!warehouse.success) return previous;
				if (
					catalog &&
					entry.permissions.some(
						(code) =>
							!catalog.some((permission) => permission.code === code) &&
							!previous?.permissions.includes(code),
					)
				)
					return undefined;
				return { ...entry, warehouse_name: warehouse.data.name };
			});
			if (
				assignments.some((entry) => !entry) ||
				new Set(update.data.warehouses.map((entry) => entry.warehouse_id))
					.size !== assignments.length
			) {
				return problem(
					422,
					"INVALID_PERMISSIONS",
					"Проверьте склады и разрешения",
				);
			}
			const changed = {
				...user,
				...update.data,
				revision: update.data.revision + 1,
				warehouses: assignments.filter((entry) => entry !== undefined),
			};
			store.set(path, {
				...result.data,
				items: items.map((item) => (item.id === changed.id ? changed : item)),
			});
			if (!sandboxPrefix) {
				const changes: AuditEvent["changes"] = [];
				const warehouseIds = new Set(
					[...user.warehouses, ...changed.warehouses].map(
						(entry) => entry.warehouse_id,
					),
				);
				const permissionLabel = (code: string) =>
					catalog?.find((permission) => permission.code === code)?.label ??
					code;
				for (const id of warehouseIds) {
					const previous = user.warehouses.find(
						(entry) => entry.warehouse_id === id,
					);
					const next = changed.warehouses.find(
						(entry) => entry.warehouse_id === id,
					);
					const before = new Set(previous?.permissions);
					const after = new Set(next?.permissions);
					if (
						before.size === after.size &&
						[...before].every((code) => after.has(code))
					)
						continue;
					changes.push({
						field: "permissions",
						label: `Права доступа · ${next?.warehouse_name ?? previous?.warehouse_name ?? id}`,
						before: [...before].map(permissionLabel),
						after: [...after].map(permissionLabel),
					});
				}
				if (changes.length) {
					const auditPath = `${base}/admin/shipment-audit`;
					const audit = auditSchema.safeParse(store.get(auditPath));
					if (audit.success) {
						const id = crypto.randomUUID();
						const actor = items.find(
							(item) => item.id === "user-sandbox-admin",
						);
						const entry: AuditEvent = {
							id,
							occurred_at: new Date().toISOString(),
							event_type: "account.permissions.updated",
							event_label: `Обновлены права · ${changed.name}`,
							result: "success",
							actor_id: actor?.id ?? null,
							actor_name: actor?.name ?? null,
							source: "account",
							warehouse_id: null,
							order_id: null,
							changes,
							correlation_id: id,
						};
						store.set(auditPath, {
							items: [entry, ...audit.data.items],
							total: audit.data.total + 1,
						});
					}
				}
			}
			return Response.json(changed, { headers: privateHeaders });
		}

		const warehouse = decodeURIComponent(warehouseId ?? "");
		if (!store.has(`${base}/warehouses/${warehouse}`)) return notFound();
		addSamples(store, warehouse);
		const entry = links.get(decodeURIComponent(linkId ?? ""));
		if (
			linkId &&
			(!entry || entry.store !== store || entry.warehouse !== warehouse)
		)
			return notFound();
		if (!entry && method === "GET") {
			const items = [...links.values()]
				.filter((item) => item.store === store && item.warehouse === warehouse)
				.map(({ link, token }) => ({
					...link,
					url: new URL(
						`/shipments#${new URLSearchParams({ token })}`,
						publicOrigin ?? request.url,
					).href,
					status:
						link.status === "active" &&
						Date.parse(link.expires_at) <= Date.now()
							? "expired"
							: link.status,
				}));
			return Response.json({ items }, { headers: privateHeaders });
		}
		if (entry && method === "DELETE") {
			entry.link.status = "revoked";
			return new Response(null, { status: 204 });
		}
		if (method !== (entry ? "PATCH" : "POST"))
			return problem(405, "METHOD_NOT_ALLOWED", "Операция недоступна");
		const revision =
			typeof body === "object" && body !== null && "revision" in body
				? body.revision
				: undefined;
		const input = guestLinkInputSchema.safeParse(body);
		if (
			!input.success ||
			Date.parse(input.data.expires_at) <= Date.now() ||
			input.data.order_ids.some((id) => !shipmentFor(store, warehouse, id))
		) {
			return problem(
				422,
				"INVALID_SCOPE",
				"Проверьте срок действия, заказы и разделы ссылки",
			);
		}
		if (entry) {
			if (
				entry.link.status !== "active" ||
				Date.parse(entry.link.expires_at) <= Date.now() ||
				revision !== entry.link.revision
			) {
				return problem(
					409,
					"STALE_REVISION",
					"Обновите список ссылок и повторите действие",
				);
			}
			entry.link = {
				...entry.link,
				...input.data,
				revision: entry.link.revision + 1,
			};
			return Response.json(entry.link, { headers: privateHeaders });
		}

		const key = request.headers.get("Idempotency-Key");
		if (!key) return problem(422, "MISSING_KEY", "Не указан ключ операции");
		const scope = attempts.get(store) ?? new Map();
		attempts.set(store, scope);
		const scopedKey = JSON.stringify([warehouse, key]);
		const serialized = JSON.stringify(input.data);
		const previous = scope.get(scopedKey);
		if (previous && previous.body !== serialized)
			return problem(
				409,
				"DUPLICATE_KEY",
				"Ключ уже использован для другой ссылки",
			);
		const id = previous?.id ?? crypto.randomUUID();
		const created =
			links.get(id) ??
			({
				link: {
					...input.data,
					id,
					revision: 0,
					status: "active",
					created_at: new Date().toISOString(),
				},
				warehouse,
				store,
				token: randomBytes(32).toString("base64url"),
			} satisfies MockLink);
		links.set(id, created);
		scope.set(scopedKey, { body: serialized, id });
		const url = new URL("/shipments", publicOrigin ?? request.url);
		url.hash = new URLSearchParams({ token: created.token }).toString();
		return Response.json(
			{ ...created.link, url: url.href },
			{ status: 201, headers: privateHeaders },
		);
	}
	return {
		handle,
		closeSandbox(store: MockStore) {
			for (const [id, entry] of links) {
				if (entry.store === store) links.delete(id);
			}
		},
	};
}
