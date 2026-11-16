import { useEffect } from "react";
import { useSandboxAccess, useWorkspaceMode } from "@/ports/session";
import { readPreference, writePreference } from "@/shared/lib";

const preference = "gridly.last";

export function readLastWarehouse() {
	return readPreference(preference);
}

export function RememberWarehouse({ warehouseId }: { warehouseId: string }) {
	const mode = useWorkspaceMode();
	const { controller } = useSandboxAccess();
	useEffect(() => {
		if (mode === "sandbox") controller.rememberWarehouse(warehouseId);
		else writePreference(preference, warehouseId);
	}, [warehouseId, mode, controller]);
	return null;
}
