export type WarehouseResource =
	| "settings"
	| "metadata"
	| "map"
	| "catalog"
	| "orders"
	| "inventory"
	| "history"
	| "robots"
	| "all";

export * from "./data";
export * from "./layout";
export * from "./ui";
export * from "./warehouseScope";
