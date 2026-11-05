import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { Button, Feedback, Modal } from "@/shared/ui";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import { OrderDetail } from "./OrderDetail";
import { OrderForm } from "./OrderForm";

export interface OrderDetailDialogProps {
	model: Pick<
		ReturnType<typeof useOrderDialogs>,
		| "detailOpen"
		| "detailError"
		| "retryDetail"
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

	if (model.detailOpen && !selected)
		return (
			<Modal title="Карточка заказа" onClose={closeOrder}>
				{model.detailError ? (
					<Feedback tone="error">
						{model.detailError}
						<Button onClick={model.retryDetail}>Повторить</Button>
					</Feedback>
				) : (
					<Feedback tone="loading">Загружаем заказ…</Feedback>
				)}
			</Modal>
		);

	return (
		<>
			{selected && (
				<Modal
					wide={!editing}
					title={editing ? "Исправить черновик" : "Карточка заказа"}
					onClose={closeOrder}
				>
					{editing ? (
						<OrderForm
							key={selected.id}
							kind={selected.kind}
							order={selected}
							warehouse={w}
							pending={pending || fetching}
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
