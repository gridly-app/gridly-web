import { useEffect } from "react";

import { useSandboxAccess, useWorkspaceMode } from "@/ports/session";
import { readPreference, writePreference } from "@/shared/lib";

const LAST_WAREHOUSE_PREFERENCE = "gridly.last";

export function readLastWarehouse() {
	return readPreference(LAST_WAREHOUSE_PREFERENCE);
}

export function useRememberWarehouse(warehouseId: string) {
	const mode = useWorkspaceMode();
	const { controller } = useSandboxAccess();

	useEffect(() => {
		if (mode === "sandbox") {
			controller.rememberWarehouse(warehouseId);

			return;
		}

		writePreference(LAST_WAREHOUSE_PREFERENCE, warehouseId);
	}, [warehouseId, mode, controller]);
}
