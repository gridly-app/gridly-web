import {
	shipmentManagementRoute,
	warehouseAccess,
	warehousePaths,
} from "@/ports/navigation";

export const deliveriesRoute = {
	id: "deliveries",
	path: warehousePaths.deliveries,
	access: warehouseAccess,
	resources: ["orders", "catalog"],
	load: () =>
		import("./ui/DeliveriesPage/DeliveriesPage").then(({ DeliveriesPage }) => ({
			default: DeliveriesPage,
		})),
} as const;

export const shipmentRoute = {
	id: "outbound",
	path: shipmentManagementRoute,
	access: ["standard"],
	resources: [],
	load: () =>
		import("./ShipmentManagement").then(({ ShipmentManagement }) => ({
			default: ShipmentManagement,
		})),
} as const;
