import { warehouseResources } from "./model/warehouseResources";
import { warehouseAccess, warehousePaths } from "@/ports/navigation";

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
