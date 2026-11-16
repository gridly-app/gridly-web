import {
	type WarehouseScreenRoute,
	warehouseAccess,
	warehousePaths,
} from "@/ports/navigation";

const common = {
	access: warehouseAccess,
	resources: ["orders", "catalog", "robots"],
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
	import("./ui/details/WarehouseOrderDialog").then(
		({ WarehouseOrderDialog }) => ({ default: WarehouseOrderDialog }),
	);
