import type { WorkspaceMode } from "@/ports/session";

const paths = {
	audit: "/admin/shipment-audit",
	system: "/admin/shipment-system",
	users: "/admin/shipment-users",
};

const apiPrefix = (mode: WorkspaceMode) =>
	mode === "sandbox" ? "/sandbox" : "";

export function adminApiPath(
	mode: WorkspaceMode,
	resource: keyof typeof paths,
) {
	return `${apiPrefix(mode)}${paths[resource]}`;
}
