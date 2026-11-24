import type { Warehouse } from "@/domain/warehouse";
import type { WorkspaceMode } from "@/ports/session";

import type { HttpClient } from "@/shared/http";

import { WarehouseGuestLinks } from "./ui/WarehouseGuestLinks/WarehouseGuestLinks";

export function GuestLinks({
	http,
	mode,
	warehouse,
	initialOrder,
	linkedOrder,
}: {
	http: HttpClient;
	mode: WorkspaceMode;
	warehouse: Warehouse;
	initialOrder: string | null;
	linkedOrder: string | null;
}) {
	const prefix = mode === "sandbox" ? "/sandbox" : "";
	const warehouseId = encodeURIComponent(warehouse.id);
	const path = `${prefix}/admin/warehouses/${warehouseId}/shipment-links`;
	const key = JSON.stringify([warehouse.id, initialOrder, linkedOrder]);

	return (
		<WarehouseGuestLinks
			key={key}
			path={path}
			http={http}
			warehouse={warehouse}
			initialOrder={initialOrder}
			linkedOrder={linkedOrder}
		/>
	);
}
