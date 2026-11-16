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

export function warehousePath(
	mode: "standard" | "sandbox",
	id: string,
	page: string = warehousePaths.map,
) {
	return `${mode === "sandbox" ? "/sandbox" : ""}/warehouses/${encodeURIComponent(id)}/${page}`;
}

export const shipmentAdministrationPath = "/admin/shipments";

export function shipmentAdminPath(mode: "standard" | "sandbox") {
	return mode === "sandbox"
		? `/sandbox${shipmentAdministrationPath}`
		: shipmentAdministrationPath;
}

export function shipmentManagementPath(warehouseId: string, orderId: string) {
	return warehousePath(
		"standard",
		warehouseId,
		shipmentManagementRoute.replace(":orderId", encodeURIComponent(orderId)),
	);
}
