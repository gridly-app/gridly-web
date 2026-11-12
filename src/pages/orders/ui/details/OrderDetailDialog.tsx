import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";
import type { useOrderSelection } from "../../model/useOrderSelection";
import { OrderForm } from "../form/OrderForm";
import { OrderDetail } from "./OrderDetail";

export interface OrderDetailDialogProps {
	model: Omit<ReturnType<typeof useOrderSelection>, "setDetail">;
	warehouse: Warehouse;
	pending: boolean;
	execute: CommandExecutor;
}

export function OrderDetailDialog({
	model,
	warehouse,
	pending,
	execute,
}: OrderDetailDialogProps) {
	const { selected, editing, closeOrder, saveDraft, fetching, editSelected } =
		model;

	if (model.detailOpen && !selected)
		return (
			<Modal title="Карточка заказа" onClose={closeOrder}>
				{model.detailError ? (
					<Feedback tone="error">
						{model.detailError}
						<RetryButton onRetry={model.retryDetail} />
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
							warehouse={warehouse}
							pending={pending || fetching}
							onSave={saveDraft}
						/>
					) : (
						<OrderDetail
							o={selected}
							w={warehouse}
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
