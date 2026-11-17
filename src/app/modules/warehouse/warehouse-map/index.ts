import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const mapRoute = {
	id: "map",
	path: warehousePaths.map,
	access: warehouseAccess,
	resources: ["map", "catalog"],
	load: () =>
		import("./WarehouseMap").then(({ MapPage }) => ({ default: MapPage })),
} as const;
