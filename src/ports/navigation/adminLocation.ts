const adminTabs = [
	"audit",
	"warehouses",
	"orders",
	"links",
	"users",
	"system",
] as const;

export type AdminTab = (typeof adminTabs)[number];

type OrderScope = { warehouse_id: string; order_id: string };
type OrderCardParams = { warehouse_id: string; order: string };
type UserKind = "account" | "guest";
type UserSelection = { user: string; user_kind?: UserKind };

type AdminDestination =
	| [tab: AdminTab]
	| [tab: "orders" | "links", params: { warehouse_id: string; order?: string }]
	| [
			tab: "links",
			params:
				| OrderScope
				| OrderCardParams
				| { warehouse_id: string; linked_order_id: string },
	  ]
	| [tab: "system", params: OrderScope & { order?: string }]
	| [tab: "users", params: UserSelection];

export type OrderLocation = { warehouseId: string; orderId: string };

export type AdminSectionLocation =
	| { tab: "audit" | "warehouses" }
	| { tab: "orders"; warehouseId: string | null }
	| {
			tab: "links";
			warehouseId: string | null;
			initialOrder: string | null;
			linkedOrder: string | null;
	  }
	| { tab: "system"; orderScope: OrderLocation | null }
	| { tab: "users"; userId: string | null; userKind: UserKind | undefined };

export function adminLocation(...[tab, params]: AdminDestination) {
	if (tab === "audit") return "?";

	return `?${new URLSearchParams({ tab, ...params })}`;
}

function readSection(params: URLSearchParams): AdminSectionLocation {
	const warehouseId = params.get("warehouse_id") || null;
	const orderId = params.get("order_id");
	const orderScope = warehouseId && orderId ? { warehouseId, orderId } : null;
	const requestedTab = params.get("tab");
	const tab = adminTabs.find((value) => value === requestedTab);

	switch (tab) {
		case "audit":
		case "warehouses":
			return { tab };
		case "orders":
			return { tab, warehouseId };
		case "links":
			return {
				tab,
				warehouseId,
				initialOrder: orderScope?.orderId ?? null,
				linkedOrder: warehouseId ? params.get("linked_order_id") || null : null,
			};
		case "system":
			return { tab, orderScope };
		case "users": {
			const userId = params.get("user");
			const kind = params.get("user_kind");
			const userKind =
				kind === "account" || kind === "guest" ? kind : undefined;

			return { tab, userId, userKind };
		}
		case undefined:
			return orderScope && requestedTab === null
				? { tab: "system", orderScope }
				: { tab: "audit" };
	}
}

export function readAdminLocation(params: URLSearchParams) {
	const warehouseId = params.get("warehouse_id");
	const orderId = params.get("order");
	const orderCard =
		warehouseId && orderId?.trim() ? { warehouseId, orderId } : null;

	return { section: readSection(params), orderCard };
}
