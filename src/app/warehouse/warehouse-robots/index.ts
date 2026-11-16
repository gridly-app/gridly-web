import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const robotsRoute = {
	id: "robots",
	path: warehousePaths.robots,
	access: warehouseAccess,
	resources: ["map", "robots", "orders", "catalog"],
	load: () =>
		import("./WarehouseRobots").then(({ WarehouseRobots }) => ({
			default: WarehouseRobots,
		})),
} as const;
