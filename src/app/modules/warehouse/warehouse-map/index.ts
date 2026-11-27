import { warehouseAccess, warehousePaths } from "@/ports/navigation";

import { warehouseResources } from "./model/warehouseResources";

export const mapRoute = {
	id: "map",
	path: warehousePaths.map,
	access: warehouseAccess,
	resources: warehouseResources,
	load: () =>
		import("./WarehouseMap").then(({ MapPage }) => ({ default: MapPage })),
} as const;
