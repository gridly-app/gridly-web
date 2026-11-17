export { adminApiPath } from "./paths";

export function adminQueryKey(scopeId: string, path: string) {
	return [scopeId, "shipment-admin", path] as const;
}
