export const warehouseKeys = {
	resource: (id: string, resource: string) =>
		["warehouses", id, "resource", resource] as const,
	all: ["warehouses"] as const,
	live: (id: string) => ["warehouses", id, "map-state"] as const,
	orders: (id: string) => ["warehouses", id, "orders"] as const,
	order: (id: string, orderId: string | null) =>
		["warehouses", id, "orders", orderId] as const,
	detail: (id: string) => ["warehouses", id, "snapshot"] as const,
};
