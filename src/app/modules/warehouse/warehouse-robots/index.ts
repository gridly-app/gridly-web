import { warehouseResources } from "./model/warehouseResources";
import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const robotsRoute = {
	id: "robots",
	path: warehousePaths.robots,
	access: warehouseAccess,
	resources: warehouseResources,
	load: () =>
		import("./WarehouseRobots").then(({ WarehouseRobots }) => ({
			default: WarehouseRobots,
		})),
} as const;
