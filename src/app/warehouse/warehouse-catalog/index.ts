import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const catalogRoute = {
	id: "catalog",
	path: warehousePaths.catalog,
	access: warehouseAccess,
	resources: ["catalog", "inventory"],
	load: () =>
		import("./WarehouseCatalog").then(({ WarehouseCatalog }) => ({
			default: WarehouseCatalog,
		})),
} as const;
