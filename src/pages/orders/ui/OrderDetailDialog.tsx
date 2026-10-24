import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { Modal } from "@/shared/ui";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import { OrderDetail } from "./OrderDetail";
import { OrderForm } from "./OrderForm";

export interface OrderDetailDialogProps {
	model: Pick<
		ReturnType<typeof useOrderDialogs>,
		| "selected"
		| "editing"
		| "closeOrder"
		| "saveDraft"
		| "fetching"
		| "editSelected"
	> & { w: Warehouse; pending: boolean; execute: CommandExecutor };
}

export function OrderDetailDialog({ model }: OrderDetailDialogProps) {
	const {
		selected,
		editing,
		closeOrder,
		w,
		pending,
		saveDraft,
		execute,
		fetching,
		editSelected,
	} = model;

	return (
		<>
			{selected && (
				<Modal
					title={editing ? "Исправить черновик" : "Карточка заказа"}
					onClose={closeOrder}
				>
					{editing ? (
						<OrderForm
							key={selected.id}
							kind={selected.kind}
							order={selected}
							warehouse={w}
							pending={pending}
							onSave={saveDraft}
						/>
					) : (
						<OrderDetail
							o={selected}
							w={w}
							command={execute}
							pending={pending || fetching}
							onEdit={editSelected}
						/>
					)}
				</Modal>
			)}
		</>
	);
}
