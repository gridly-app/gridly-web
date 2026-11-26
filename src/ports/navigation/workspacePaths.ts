export const warehousePaths = {
	information: "information",
	map: "map",
	robots: "robots",
	catalog: "catalog",
	inbound: "inbound",
	outbound: "outbound",
	deliveries: "deliveries",
	inventory: "inventory",
	history: "history",
	settings: "settings",
} as const;

export const shipmentManagementRoute = `${warehousePaths.outbound}/:orderId/shipment`;

export const newWarehouseId = "new";

export const accountEntryPath = "/app";

export const sandboxEntryPath = "/sandbox";

export const signInPath = "/auth";

export const registrationPath = `${signInPath}?mode=register`;

type PathMode = "standard" | "sandbox";

export function workspaceEntryPath(mode: PathMode) {
	return mode === "sandbox" ? sandboxEntryPath : accountEntryPath;
}

export function workspacePathPrefix(mode: PathMode) {
	return mode === "sandbox" ? sandboxEntryPath : "";
}

export function warehousePath(
	mode: PathMode,
	id: string,
	page: string = warehousePaths.map,
) {
	return `${workspacePathPrefix(mode)}/warehouses/${encodeURIComponent(id)}/${page}`;
}

export const shipmentAdministrationPath = "/admin/shipments";

export function shipmentAdminPath(mode: PathMode) {
	return `${workspacePathPrefix(mode)}${shipmentAdministrationPath}`;
}

export function shipmentManagementPath(warehouseId: string, orderId: string) {
	return warehousePath(
		"standard",
		warehouseId,
		shipmentManagementRoute.replace(":orderId", encodeURIComponent(orderId)),
	);
}
