import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse";

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

const resourceFields: Record<WarehouseResource, (keyof Warehouse)[]> = {
	settings: ["settings"],
	metadata: [
		"cabinet",
		"location",
		"name",
		"timezone",
		"width",
		"height",
		"revision",
		"policyRevision",
		"version",
		"published",
		"policy",
		"summary",
		"allowedActions",
		"running",
		"workerHealth",
	],
	map: [
		"width",
		"height",
		"version",
		"published",
		"cells",
		"draft",
		"routePlans",
		"draftRoutes",
		"draftRevision",
		"robots",
		"tick",
		"stateVersion",
		"asOf",
	],
	catalog: ["categories", "products"],
	orders: ["orders"],
	inventory: ["stock"],
	history: ["events", "writeOffs"],
	robots: ["robots"],
	all: [],
};

export function warehouseResourceData(
	resource: WarehouseResource,
	warehouse: Warehouse,
): Partial<Warehouse> {
	return Object.fromEntries(
		resourceFields[resource].map((key) => [key, warehouse[key]]),
	);
}

export function commandResources(
	action: WarehouseCommand["action"],
): WarehouseResource[] {
	switch (action) {
		case "deleteWarehouse":
			return [];
		case "archiveProduct":
		case "archiveCategory":
			return ["catalog", "map", "history"];
		case "deleteOrder":
			return ["orders", "inventory", "history", "metadata"];
		case "warehouseSettings":
			return ["settings"];
		case "product":
		case "category":
			return ["catalog", "history"];
		case "order":
		case "start":
		case "confirm":
		case "cancel":
		case "orderAction":
		case "taskAction":
			return ["orders", "inventory", "robots", "history", "metadata"];
		case "writeoff":
			return ["inventory", "history", "metadata"];
		case "robot":
		case "deleteRobot":
			return ["robots", "metadata", "history"];
		case "settings":
			return ["metadata", "history"];
		default:
			return ["map", "robots", "metadata", "history"];
	}
}
