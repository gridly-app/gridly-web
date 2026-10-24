import { Modal } from "@/shared/ui";
import type { WorkspaceShellModel } from "../../model/useWorkspaceShell";
import { CreateWarehouseForm } from "./CreateWarehouseForm";

export interface WarehouseCreationDialogProps {
	model: WorkspaceShellModel["creation"];
}

export function WarehouseCreationDialog({
	model,
}: WarehouseCreationDialogProps) {
	const { open, setOpen, pending, save } = model;

	return (
		<>
			{open && (
				<Modal title="Новый склад" onClose={() => setOpen(false)}>
					<CreateWarehouseForm pending={pending} onSave={save} />
				</Modal>
			)}
		</>
	);
}
