import type { WarehouseCommand, WarehouseResource } from "@/domain/warehouse";

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
		case "saveMap":
			return ["map", "catalog", "robots", "metadata", "history"];
		default:
			return ["map", "robots", "metadata", "history"];
	}
}
