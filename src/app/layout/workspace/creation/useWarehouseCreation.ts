import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWarehouse, type WarehouseInput } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { UserError, useOnlineStatus } from "@/shared/lib";

export function useWarehouseCreation(warehouseId: string) {
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const creation = useCreateWarehouse();
	const online = useOnlineStatus();
	const [state, setState] = useState({
		warehouseId,
		open: warehouseId === "new",
	});
	const open =
		state.warehouseId === warehouseId ? state.open : warehouseId === "new";

	function setOpen(open: boolean) {
		setState({ warehouseId, open });
	}

	async function save(warehouse: WarehouseInput) {
		if (!navigator.onLine)
			throw new UserError("Для создания склада нужно соединение с сервером");
		const added = await creation.mutateAsync(warehouse);
		setOpen(false);
		void navigate(warehousePath(mode, added.id));
	}

	return { open, setOpen, save, pending: creation.isPending || !online };
}
