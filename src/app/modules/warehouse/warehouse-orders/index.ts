import {
	type WarehouseScreenRoute,
	warehouseAccess,
	warehousePaths,
} from "@/ports/navigation";

import { warehouseResources } from "./model/warehouseResources";

const common = {
	access: warehouseAccess,
	resources: warehouseResources,
} as const;

export const ordersRoute = {
	inbound: {
		...common,
		id: "inbound",
		path: warehousePaths.inbound,
	} satisfies WarehouseScreenRoute,
	outbound: {
		...common,
		id: "outbound",
		path: warehousePaths.outbound,
	} satisfies WarehouseScreenRoute,
	load: () =>
		import("./WarehouseOrders").then(({ WarehouseOrders }) => ({
			default: WarehouseOrders,
		})),
} as const;

export const loadOrderDialog = () =>
	import("./ui/WarehouseOrderDialog/WarehouseOrderDialog").then(
		({ WarehouseOrderDialog }) => ({ default: WarehouseOrderDialog }),
	);
