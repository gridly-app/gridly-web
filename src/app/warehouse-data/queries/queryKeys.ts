export const layoutOperationNamespace = "warehouse-layout-operation";

export function createWarehouseKeys(scopeId: string) {
	const all = ["warehouses", scopeId] as const;
	const layoutOperations = [layoutOperationNamespace, scopeId] as const;
	const warehouse = (id: string) => [...all, id] as const;
	const resources = (id: string) => [...warehouse(id), "resource"] as const;
	const selectionSummaries = (id: string) =>
		[...warehouse(id), "selection-summary"] as const;
	const orders = (id: string) => [...warehouse(id), "orders"] as const;

	return {
		scopeId,
		all,
		warehouse,
		layoutOperations,
		layoutOperation: (id: string) => [...layoutOperations, id] as const,
		resources,
		resource: (id: string, resource: string) =>
			[...resources(id), resource] as const,
		selectionSummaries,
		selectionSummary: (id: string, cells: string[]) =>
			[...selectionSummaries(id), cells] as const,
		live: (id: string) => [...warehouse(id), "map-state"] as const,
		connection: (id: string) => [...warehouse(id), "connection"] as const,
		publishedLayout: (id: string) =>
			[...warehouse(id), "published-layout"] as const,
		orders,
		order: (id: string, orderId: string | null) =>
			[...orders(id), orderId] as const,
		detail: (id: string) => [...warehouse(id), "snapshot"] as const,
	};
}

export type WarehouseKeys = ReturnType<typeof createWarehouseKeys>;
