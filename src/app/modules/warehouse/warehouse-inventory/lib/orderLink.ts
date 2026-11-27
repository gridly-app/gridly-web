import type { Order } from "@/domain/warehouse";
import { warehousePath, type WorkspaceAccess } from "@/ports/navigation";

export function orderLink(
	mode: WorkspaceAccess,
	warehouseId: string,
	kind: Order["kind"],
	orderId: string,
) {
	return {
		pathname: warehousePath(mode, warehouseId, kind),
		search: new URLSearchParams({ order: orderId }).toString(),
	};
}
