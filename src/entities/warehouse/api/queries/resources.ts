import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse/schemas";

export type WarehouseResource =
	| "metadata"
	| "map"
	| "catalog"
	| "orders"
	| "inventory"
	| "history"
	| "robots"
	| "all";

export const resourceFields: Record<WarehouseResource, (keyof Warehouse)[]> = {
	metadata: [
		"name",
		"timezone",
		"revision",
		"policyRevision",
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
	history: ["events"],
	robots: ["robots"],
	all: [],
};

export function commandResources(
	action: WarehouseCommand["action"],
): WarehouseResource[] {
	switch (action) {
		case "product":
		case "category":
			return ["catalog"];
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
			return ["robots", "metadata"];
		case "settings":
			return ["metadata"];
		default:
			return ["map", "robots", "metadata"];
	}
}
