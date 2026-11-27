import type { WarehouseView } from "@/domain/warehouse";
import type { CommandExecutor } from "@/domain/warehouse";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";

import type { useOrderSelection } from "../../model/useOrderSelection";
import { OrderDetail } from "../OrderDetail/OrderDetail";
import { OrderForm } from "../OrderForm/OrderForm";

export function OrderDetailDialog({
	model,
	warehouse,
	isPending,
	execute,
}: {
	model: Pick<
		ReturnType<typeof useOrderSelection>,
		| "selected"
		| "editing"
		| "closeOrder"
		| "saveDraft"
		| "fetching"
		| "editSelected"
		| "detailOpen"
		| "detailError"
		| "retryDetail"
	>;
	warehouse: WarehouseView<"catalog" | "robots">;
	isPending: boolean;
	execute: CommandExecutor;
}) {
	const { selected, editing, closeOrder, saveDraft, fetching, editSelected } =
		model;
	const isBusy = isPending || fetching;

	if (model.detailOpen && !selected) {
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
	}

	if (!selected) return null;

	return (
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
					pending={isBusy}
					onSave={saveDraft}
				/>
			) : (
				<OrderDetail
					order={selected}
					warehouse={warehouse}
					command={execute}
					pending={isBusy}
					onEdit={editSelected}
				/>
			)}
		</Modal>
	);
}
