import { useMatches } from "react-router-dom";

import type { WarehouseRouteHandle } from "@/ports/navigation";

export type WarehouseRoute = WarehouseRouteHandle & { id: string };

function isWarehouseRouteHandle(
	handle: unknown,
): handle is WarehouseRouteHandle {
	return (
		typeof handle === "object" &&
		handle !== null &&
		"warehouseSection" in handle
	);
}

export function useWarehouseRoute(): WarehouseRoute | undefined {
	const match = useMatches().at(-1);

	if (!match || !isWarehouseRouteHandle(match.handle)) return undefined;

	return { id: match.id, ...match.handle };
}
