export const warehouseKeys = {
	all: ["warehouses"] as const,
	live: (id: string) => ["warehouses", id, "map-state"] as const,
	orders: (id: string) => ["warehouses", id, "orders"] as const,
	order: (id: string, orderId: string | null) =>
		["warehouses", id, "orders", orderId] as const,
	detail: (id: string) => ["warehouses", id, "snapshot"] as const,
};
