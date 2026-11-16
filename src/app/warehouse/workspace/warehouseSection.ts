import { useMatches } from "react-router-dom";
import type { WarehouseRouteHandle } from "@/ports/navigation";

function isWarehouseRouteHandle(
	handle: unknown,
): handle is WarehouseRouteHandle {
	return (
		typeof handle === "object" &&
		handle !== null &&
		"warehouseSection" in handle
	);
}

export function useWarehouseRoute() {
	const match = useMatches().at(-1);
	return match && isWarehouseRouteHandle(match.handle)
		? { id: match.id, ...match.handle }
		: undefined;
}
