import { randomBytes } from "node:crypto";
import { z } from "zod";

import { type GuestSection, guestSectionSchema } from "../src/domain/shipment";
import {
	guestLinkInputSchema,
	type GuestLink,
	type GuestLinkInput,
} from "../src/app/modules/guest-links/api/guestLink.dto";
import { orderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";

import {
	base,
	type MockStore,
	notFound,
	privateHeaders,
	problem,
} from "./mock-http";
import { publicShipmentResponse } from "./public-shipment-mock";
import { shipmentFor } from "./working-shipment-mock";

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

export function createGuestLinksMock(seedLinks: boolean) {
	const links = new Map<string, MockLink>();
	const attempts = new WeakMap<
		MockStore,
		Map<string, { body: string; id: string; createdAt: number }>
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
					origin: "admin",
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

	function handlePublicShipment(request: Request) {
		const bearer = request.headers.get("Authorization");
		const entry = [...links.values()].find(
			(item) => `Bearer ${item.token}` === bearer,
		);

		if (!entry) return;

		return publicShipmentResponse(request, entry);
	}

	function revokeIssuedLink(id?: string) {
		const entry = id ? links.get(id) : undefined;

		if (entry) entry.link.status = "revoked";
	}

	function handleAdminLinks(
		request: Request,
		store: MockStore,
		warehouseId: string | undefined,
		linkId: string | undefined,
		body: unknown,
		publicOrigin?: string,
	) {
		const { method } = request;
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
			const items = [];

			for (const item of links.values()) {
				if (item.store !== store || item.warehouse !== warehouse) continue;

				const { link } = item;
				const isExpired =
					link.status === "active" && Date.parse(link.expires_at) <= Date.now();

				items.push({ ...link, status: isExpired ? "expired" : link.status });
			}

			return Response.json({ items }, { headers: privateHeaders });
		}
		if (entry && method === "DELETE") {
			if (entry.link.status === "revoked")
				return problem(409, "LINK_ALREADY_REVOKED", "Ссылка уже отозвана", {
					link_id: entry.link.id,
					status: "revoked",
				});

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
			(entry && Date.parse(input.data.expires_at) <= Date.now()) ||
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

		return issueLink(
			request,
			store,
			warehouse,
			input.data,
			"admin",
			publicOrigin,
		);
	}

	function issueLink(
		request: Request,
		store: MockStore,
		warehouse: string,
		input: GuestLinkInput,
		origin: "operator" | "admin",
		publicOrigin?: string,
		onCreated?: (link: GuestLink) => void,
	) {
		const { pathname } = new URL(request.url);
		const key = request.headers.get("Idempotency-Key");
		if (!key) return problem(422, "MISSING_KEY", "Не указан ключ операции");
		const scope = attempts.get(store) ?? new Map();
		attempts.set(store, scope);
		const scopedKey = JSON.stringify([pathname, key]);
		const serialized = JSON.stringify(input);
		const receipt = scope.get(scopedKey);
		const previous =
			receipt && Date.now() - receipt.createdAt < 24 * 60 * 60 * 1000
				? receipt
				: undefined;
		if (previous && previous.body !== serialized)
			return problem(
				409,
				"RECEIPT_BODY_MISMATCH",
				"Ключ уже использован для другой ссылки",
			);
		const id = previous?.id ?? crypto.randomUUID();
		const replayEntry = previous && links.get(id);

		if (replayEntry?.link.status === "revoked")
			return problem(409, "LINK_ALREADY_REVOKED", "Ссылка уже отозвана", {
				link_id: id,
				status: "revoked",
			});
		if (previous && Date.now() - previous.createdAt >= 5 * 60 * 1000)
			return problem(
				410,
				"IDEMPOTENCY_SECRET_EXPIRED",
				"URL больше недоступен",
				{
					link_id: id,
					status: replayEntry?.link.status ?? "active",
				},
			);
		const created =
			links.get(id) ??
			({
				link: {
					...input,
					origin,
					id,
					revision: 0,
					status: "active",
					created_at: new Date().toISOString(),
				},
				warehouse,
				store,
				token: randomBytes(32).toString("base64url"),
			} satisfies MockLink);
		if (!previous) {
			if (Date.parse(input.expires_at) <= Date.now())
				return problem(422, "INVALID_SCOPE", "Проверьте срок действия ссылки");

			onCreated?.(created.link);
		}

		links.set(id, created);
		if (!previous)
			scope.set(scopedKey, { body: serialized, id, createdAt: Date.now() });
		const url = new URL("/shipments", publicOrigin ?? request.url);
		url.hash = new URLSearchParams({ token: created.token }).toString();
		return Response.json(
			{ ...created.link, url: url.href },
			{ status: previous ? 200 : 201, headers: privateHeaders },
		);
	}
	return {
		handleAdminLinks,
		handlePublicShipment,
		issueLink,
		revokeIssuedLink,
		closeSandbox(store: MockStore) {
			for (const [id, entry] of links) {
				if (entry.store === store) links.delete(id);
			}
		},
	};
}
