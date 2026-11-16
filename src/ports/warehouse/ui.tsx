import { type ComponentType, createContext, useContext } from "react";
import type { Warehouse } from "@/domain/warehouse";

interface DeleteWarehouseProps {
	warehouse: Warehouse;
	onDeleted: () => void;
	onCancel: () => void;
}

interface StatusBadgeProps {
	value: string;
}

interface WarehouseUi {
	DeleteWarehouseDialog: ComponentType<DeleteWarehouseProps>;
	StatusBadge: ComponentType<StatusBadgeProps>;
}

const Context = createContext<WarehouseUi | null>(null);
export const WarehouseUiProvider = Context.Provider;

function useWarehouseUi() {
	const ui = useContext(Context);
	if (!ui) throw new Error("WarehouseUiProvider is missing");

	return ui;
}

export function DeleteWarehouseDialog(props: DeleteWarehouseProps) {
	const { DeleteWarehouseDialog: Dialog } = useWarehouseUi();

	return <Dialog {...props} />;
}

export function StatusBadge(props: StatusBadgeProps) {
	const { StatusBadge: Badge } = useWarehouseUi();

	return <Badge {...props} />;
}
