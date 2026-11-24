import { expect, test } from "bun:test";
import { z } from "zod";
import { systemSchema } from "@/app/modules/system/api/system.dto";
import { guestLinksSchema } from "@/app/modules/guest-links/api/guestLink.dto";
import { workingShipmentSchema } from "@/app/modules/warehouse/shipment-management/model/shipment.dto";
import { createAdminMock, type MockStore } from "../../bruno/admin-mock";
import {
	loadBrunoMockRoutes,
	loadMockRoutes,
	loadWorkspaceSamples,
} from "../../bruno/mock-fixture";
import {
	shiftDay,
	warehouseDay,
} from "../../src/app/modules/warehouse/warehouse-information/model/reportPeriod";
import { productDto } from "../../src/app/modules/warehouse-data/api/catalog/catalogDto";
import { eventDto } from "../../src/app/modules/warehouse-data/api/history/historyDto";
import { orderDto } from "../../src/app/modules/warehouse-data/api/orders/orderDto";
import { robotDto } from "../../src/app/modules/warehouse-data/api/robots/robotDto";
import { warehouseDto } from "../../src/app/modules/warehouse-data/api/warehouses/warehouseDto";

const base = "http://gridly.test/api/v1";
const links = "/admin/warehouses/warehouse-demo/shipment-links";
const input = {
	name: "Клиент",
	expires_at: "2099-01-01T00:00:00Z",
	order_ids: ["order-out-2087"],
	sections: ["milestones"],
};

async function fixture() {
	const routes = await loadMockRoutes();
	const store: MockStore = new Map();
	for (const { request, response } of routes) {
		if (
			request.method === "GET" &&
			response.status === 200 &&
			response.body?.type === "json" &&
			!store.has(request.url)
		) {
			store.set(request.url, JSON.parse(response.body.data));
		}
	}
	const mock = createAdminMock();
	return (path: string, init?: RequestInit) =>
		mock.handle(new Request(base + path, init), store);
}

test("guest responses exclude orders and fields outside the link scope", async () => {
	const request = await fixture();
	const created = await request(links, {
		method: "POST",
		headers: {
			Authorization: "Bearer bruno-account-token",
			"Idempotency-Key": "test-create",
		},
		body: JSON.stringify(input),
	});
	expect(created?.status).toBe(201);
	const issued = await created?.json();
	const token = new URLSearchParams(new URL(issued.url).hash.slice(1)).get(
		"token",
	);
	const headers = { Authorization: `Bearer ${token}` };
	const guest = await request("/public/shipments", { headers });
	const data = await guest?.json();

	expect(data.orders.map((order: { id: string }) => order.id)).toEqual([
		"order-out-2087",
	]);
	const orderFields = Object.keys(data.orders[0]);

	orderFields.sort();

	expect(orderFields).toEqual(["id", "milestones", "order", "sections"]);
	expect(guest?.headers.get("Cache-Control")).toBe("no-store");
	const download = await request(
		"/public/shipments/documents/document-shipment-1/download",
		{ headers },
	);
	expect(download?.status).toBe(404);
});

test("guest link writes require admin access and orders from the selected warehouse", async () => {
	const request = await fixture();
	const body = JSON.stringify({ ...input, order_ids: ["order-north-3101"] });

	const forbidden = await request(links, {
		method: "POST",
		headers: { Authorization: "Bearer bruno-shipment-operator-token" },
		body,
	});
	const invalid = await request(links, {
		method: "POST",
		headers: {
			Authorization: "Bearer bruno-account-token",
			"Idempotency-Key": "test-foreign-order",
		},
		body,
	});

	expect(forbidden?.status).toBe(403);
	expect(invalid?.status).toBe(422);
});

test("workspace samples populate warehouse resources and private link lists", async () => {
	const now = Date.parse("2026-11-14T12:00:00Z");
	const { store } = await loadWorkspaceSamples(now);
	const warehouses = z
		.object({ items: z.array(warehouseDto) })
		.parse(store.get("/api/v1/warehouses")).items;
	expect(warehouses).toHaveLength(5);
	for (const warehouse of warehouses) {
		const path = `/api/v1/warehouses/${warehouse.id}`;
		expect(warehouseDto.parse(store.get(path)).id).toBe(warehouse.id);
		expect(
			z.object({ items: z.array(robotDto) }).parse(store.get(`${path}/robots`))
				.items.length,
		).toBeGreaterThanOrEqual(5);
		const orders = z
			.object({ items: z.array(orderDto) })
			.parse(store.get(`${path}/orders`)).items;
		const products = z
			.object({ items: z.array(productDto) })
			.parse(store.get(`${path}/products`)).items;
		const productIds = new Set(products.map(({ id }) => id));
		const events = z
			.object({ items: z.array(eventDto) })
			.parse(store.get(`${path}/events`)).items;
		const eventsById = new Map(events.map((event) => [event.id, event]));
		const today = warehouseDay(now, warehouse.time_zone);
		const expectedDays = new Set(
			Array.from({ length: 30 }, (_, offset) => shiftDay(today, -offset)),
		);
		for (const kind of ["inbound", "outbound"] as const) {
			const ordersByKind = orders.filter((order) => order.kind === kind);
			const days = ordersByKind.map((order) =>
				warehouseDay(order.created_at, warehouse.time_zone),
			);
			expect(new Set(days.filter((day) => expectedDays.has(day)))).toEqual(
				expectedDays,
			);
		}
		const warehouseAddress = `${warehouse.name}, ${warehouse.cabinet_settings?.location}`;
		for (const order of orders) {
			const orderPath = `${path}/orders/${order.id}`;
			expect(store.get(orderPath)).toEqual(order);
			const lines = z
				.array(
					z.object({
						id: z.string(),
						product_id: z.string(),
						quantity: z.number(),
					}),
				)
				.parse(order.lines);
			expect(lines.length).toBeGreaterThanOrEqual(2);
			expect(lines.every((line) => productIds.has(line.product_id))).toBe(true);
			expect(order.quantity).toBe(
				lines.reduce((sum, line) => sum + line.quantity, 0),
			);
			expect(eventsById.get(`event-${order.id}`)?.created_at).toBe(
				order.created_at,
			);
			const shipment = workingShipmentSchema.parse(
				store.get(`${orderPath}/shipment`),
			);
			expect(shipment.order.number).toBe(order.number ?? order.id);
			expect(
				shipment.items.map((item) => [item.order_line_id, item.quantity]),
			).toEqual(lines.map((line) => [line.id, line.quantity]));
			expect(shipment.route).toEqual({
				origin_address:
					order.kind === "inbound" ? expect.any(String) : warehouseAddress,
				destination_address:
					order.kind === "inbound" ? warehouseAddress : expect.any(String),
			});
		}
	}
	const mock = createAdminMock({ seedLinks: true });
	const response = await mock.handle(
		new Request(base + links, {
			headers: { Authorization: "Bearer bruno-account-token" },
		}),
		store,
	);
	const data = await response?.json();
	const seeded = guestLinksSchema.parse(data).items;

	expect(seeded).toHaveLength(6);
	expect(new Set(seeded.map(({ status }) => status))).toEqual(
		new Set(["active", "expired", "revoked"]),
	);
	expect(data.items[0]).not.toHaveProperty("url");
	expect(data.items[0]).not.toHaveProperty("token");
});

test("generated Bruno routes carry the same incoming and outgoing tracking used by the sandbox API", async () => {
	const now = Date.parse("2026-11-14T12:00:00Z");
	const routes = await loadBrunoMockRoutes(now);
	const { store } = await loadWorkspaceSamples(now);
	const mock = createAdminMock({ seedLinks: true });
	const paths = [
		"/warehouses/warehouse-demo/orders/order-in-1042/shipment",
		"/warehouses/warehouse-demo/orders/order-out-2087/shipment",
	];
	const warehouse = "Центральный склад, Москва, ул. Складочная, 1";
	const sandboxRule = ({ value }: { value: string }) =>
		value === "Bearer bruno-sandbox-token";

	const inbound = await mock.handle(
		new Request(base + paths[0], {
			headers: { Authorization: "Bearer test-sandbox" },
		}),
		store,
		store,
	);
	const outbound = await mock.handle(
		new Request(base + paths[1], {
			headers: { Authorization: "Bearer bruno-account-token" },
		}),
		store,
	);

	expect(inbound?.status).toBe(200);
	expect(outbound?.status).toBe(200);
	const incoming = workingShipmentSchema.parse(await inbound?.json());
	const outgoing = workingShipmentSchema.parse(await outbound?.json());
	expect(incoming.route).toEqual({
		origin_address: "Тверь, Промышленный проезд, 8",
		destination_address: warehouse,
	});
	expect(outgoing.route).toEqual({
		origin_address: warehouse,
		destination_address: "Казань, ул. Техническая, 17",
	});
	const matchingRoute = (path: string | undefined) =>
		routes.find(
			({ request, rules }) =>
				request.url === `/api/v1${path}` && rules?.conditions.some(sandboxRule),
		)?.response.body?.data;
	expect(JSON.parse(matchingRoute(paths[0]) ?? "null")).toEqual(incoming);
	expect(JSON.parse(matchingRoute(paths[1]) ?? "null")).toEqual(outgoing);
});

test("system date filters compare instants when an error carries a UTC offset", async () => {
	const { store } = await loadWorkspaceSamples(
		Date.parse("2026-11-17T00:00:00Z"),
	);
	const path = "/admin/shipment-system";
	const record = {
		occurred_at: "2026-11-16T23:30:00-02:00",
		component: "warehouse",
		message: "Граница суток",
		correlation_id: "operation-1",
		retry_state: null,
	};

	store.set(`/api/v1${path}`, {
		checked_at: "2026-11-17T02:00:00Z",
		components: [],
		error_count: 1,
		recent_errors: [record],
		jobs: [],
	});

	const request = new Request(`${base}${path}?from=2026-11-17T00:00:00.000Z`, {
		headers: { Authorization: "Bearer bruno-account-token" },
	});
	const mock = createAdminMock({ seedLinks: true });
	const response = await mock.handle(request, store);
	const data = systemSchema.parse(await response?.json());

	expect(data.recent_errors).toEqual([record]);
	expect(data.error_count).toBe(1);
});

test("warehouse membership changes preserve the account and its other assignments", async () => {
	const request = await fixture();
	const path = "/admin/shipment-users";
	const headers = {
		Authorization: "Bearer bruno-account-token",
		"Content-Type": "application/json",
	};
	const assignment = {
		login: "operator@gridly.local",
		warehouse_id: "warehouse-north",
		permissions: ["shipment.audit"],
	};
	const add = (permissions: string[]) =>
		request(`${path}/assignments`, {
			method: "POST",
			headers,
			body: JSON.stringify({ ...assignment, permissions }),
		});

	const invalid = await add(assignment.permissions);
	expect(invalid?.status).toBe(422);
	expect(await invalid?.json()).toMatchObject({
		error: { code: "INVALID_PERMISSION_SET" },
	});

	const added = await add(["warehouse.view", "shipment.audit"]);
	expect(added?.status).toBe(201);

	const member = await added?.json();
	const duplicate = await add(["warehouse.view"]);
	expect(duplicate?.status).toBe(409);
	const target = `${path}/${member.id}/warehouses/warehouse-north`;
	const revoked = await request(target, {
		method: "DELETE",
		headers: { ...headers, "If-Match": `"${member.revision}"` },
	});

	expect(revoked?.status).toBe(204);
	const users = await (await request(path, { headers }))?.json();
	const account = users.items.find(
		({ id }: { id: string }) => id === member.id,
	);

	expect(account).toMatchObject({
		login: assignment.login,
		warehouses: [{ warehouse_id: "warehouse-demo" }],
	});
});

test("document upload replays by request ID and publishes one version per chain", async () => {
	const { store } = await loadWorkspaceSamples();
	const mock = createAdminMock({ seedLinks: true });
	const path = "/warehouses/warehouse-demo/orders/order-out-2087/shipment";
	const headers = { Authorization: "Bearer bruno-account-token" };
	const request = (target: string, init: RequestInit = {}) =>
		mock.handle(new Request(base + target, { headers, ...init }), store);

	function uploadForm(requestId: string, previousId?: string) {
		const form = new FormData();

		form.set("name", "Накладная");
		form.set("category", "transport");
		form.set(
			"file",
			new File(["%PDF-1.7"], "Накладная.pdf", { type: "application/pdf" }),
		);
		form.set("upload_request_id", requestId);
		if (previousId) form.set("previous_document_id", previousId);

		return form;
	}

	const send = (body: FormData) =>
		request(`${path}/documents`, { method: "POST", body });
	const key = crypto.randomUUID();
	const first = await send(uploadForm(key));
	const original = await first?.json();
	const replay = await send(uploadForm(key));

	expect(first?.status).toBe(201);
	expect(replay?.status).toBe(200);
	expect(await replay?.json()).toEqual(original);

	const second = await send(uploadForm(crypto.randomUUID(), original.id));
	const replacement = await second?.json();
	expect(replacement).toMatchObject({
		chain_id: original.chain_id,
		is_latest: true,
		version: 2,
		published: false,
	});
	const fork = await send(uploadForm(crypto.randomUUID(), original.id));
	expect(fork?.status).toBe(409);
	expect(await fork?.json()).toMatchObject({
		error: { code: "STALE_DOCUMENT_VERSION" },
	});

	const publish = (id: string) =>
		request(`${path}/documents/${id}`, {
			method: "PATCH",
			headers: { ...headers, "Content-Type": "application/json" },
			body: JSON.stringify({ published: true }),
		});
	await publish(original.id);
	await publish(replacement.id);

	const shipment = workingShipmentSchema.parse(
		await (await request(path))?.json(),
	);
	const history = shipment.documents.filter(
		({ chain_id }) => chain_id === original.chain_id,
	);
	expect(
		history.map(({ published, is_latest }) => [published, is_latest]),
	).toEqual([
		[false, false],
		[true, true],
	]);
	const file = await request(`${path}/documents/${original.id}/download`);
	expect(file?.status).toBe(200);
	expect(file?.headers.get("Content-Disposition")).toContain(
		encodeURIComponent("Накладная.pdf"),
	);
});
