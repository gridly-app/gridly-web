import type { WorkspaceMode } from "@/ports/session";

const paths = {
	audit: "/admin/shipment-audit",
	system: "/admin/shipment-system",
	users: "/admin/shipment-users",
};

function apiPrefix(mode: WorkspaceMode) {
	return mode === "sandbox" ? "/sandbox" : "";
}

export function adminApiPath(
	mode: WorkspaceMode,
	resource: keyof typeof paths,
) {
	return `${apiPrefix(mode)}${paths[resource]}`;
}

export function guestLinksApiPath(mode: WorkspaceMode, warehouseId: string) {
	const warehouse = encodeURIComponent(warehouseId);

	return `${apiPrefix(mode)}/admin/warehouses/${warehouse}/shipment-links`;
}

export function warehouseOwnerApiPath(
	mode: WorkspaceMode,
	warehouseId: string,
) {
	const warehouse = encodeURIComponent(warehouseId);

	return `${apiPrefix(mode)}/admin/warehouses/${warehouse}/owner`;
}
