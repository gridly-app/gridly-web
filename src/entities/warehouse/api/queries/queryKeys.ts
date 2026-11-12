export const warehouseKeys = {
	resource: (id: string, resource: string) =>
		["warehouses", id, "resource", resource] as const,
	all: ["warehouses"] as const,
	live: (id: string) => ["warehouses", id, "map-state"] as const,
	connection: (id: string) => ["warehouses", id, "connection"] as const,
	publishedLayout: (id: string) =>
		["warehouses", id, "published-layout"] as const,
	orders: (id: string) => ["warehouses", id, "orders"] as const,
	order: (id: string, orderId: string | null) =>
		["warehouses", id, "orders", orderId] as const,
	detail: (id: string) => ["warehouses", id, "snapshot"] as const,
};
