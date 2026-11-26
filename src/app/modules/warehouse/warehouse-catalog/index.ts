import { warehouseResources } from "./model/warehouseResources";
import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const catalogRoute = {
	id: "catalog",
	path: warehousePaths.catalog,
	access: warehouseAccess,
	resources: warehouseResources,
	load: () =>
		import("./WarehouseCatalog").then(({ WarehouseCatalog }) => ({
			default: WarehouseCatalog,
		})),
} as const;
