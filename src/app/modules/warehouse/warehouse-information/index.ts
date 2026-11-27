import { warehouseAccess, warehousePaths } from "@/ports/navigation";

import { warehouseResources } from "./model/warehouseResources";

export const informationRoute = {
	id: "information",
	path: warehousePaths.information,
	access: warehouseAccess,
	resources: warehouseResources,
	load: () =>
		import("./WarehouseInformation").then(({ WarehouseInformation }) => ({
			default: WarehouseInformation,
		})),
} as const;
