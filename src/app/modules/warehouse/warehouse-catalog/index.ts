import { warehouseAccess, warehousePaths } from "@/ports/navigation";

import { warehouseResources } from "./model/warehouseResources";

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
