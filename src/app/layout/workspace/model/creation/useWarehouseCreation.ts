import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWarehouse, type Warehouse } from "@/entities/warehouse";

export function useWarehouseCreation(warehouseId: string) {
	const navigate = useNavigate();
	const creation = useCreateWarehouse();
	const [state, setState] = useState({
		warehouseId,
		open: warehouseId === "new",
	});
	const open =
		state.warehouseId === warehouseId ? state.open : warehouseId === "new";

	function setOpen(open: boolean) {
		setState({ warehouseId, open });
	}

	async function save(warehouse: Warehouse) {
		const added = await creation.mutateAsync(warehouse);
		setOpen(false);
		void navigate(`/warehouses/${added.id}/map`);
	}

	return { open, setOpen, save, pending: creation.isPending };
}
