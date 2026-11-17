import { warehouseAccess, warehousePaths } from "@/ports/navigation";

export const historyRoute = {
	id: "history",
	path: warehousePaths.history,
	access: warehouseAccess,
	resources: ["history"],
	load: () =>
		import("./WarehouseHistory").then(({ WarehouseHistory }) => ({
			default: WarehouseHistory,
		})),
} as const;
