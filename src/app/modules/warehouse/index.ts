import { warehouseAccess } from "@/ports/navigation";

export {
	WarehouseOrderCard,
	warehouseChildren,
} from "./warehouse-routes.compose";
export { readLastWarehouse } from "./model/lastWarehouse";

export const warehouseWorkspaceRoute = {
	id: "warehouse",
	path: "warehouses/:warehouseId",
	access: warehouseAccess,
	load: () =>
		import("./Warehouse").then(({ Warehouse }) => ({ default: Warehouse })),
} as const;
