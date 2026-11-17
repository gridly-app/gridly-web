import {
	type CommandExecutor,
	type Warehouse,
	warehouseCommandSchema,
} from "@/domain/warehouse";
import { useWarehouseCommand, useWarehouseResources } from "@/ports/warehouse";
import { errorMessage, UserError } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";
import { useOrderSelection } from "../../model/useOrderSelection";
import { OrderDetailDialog } from "./OrderDetailDialog";

export function WarehouseOrderDialog({ warehouse }: { warehouse: Warehouse }) {
	const resources = useWarehouseResources(warehouse, ["catalog", "robots"]);
	const mutation = useWarehouseCommand(warehouse.id);
	const execute: CommandExecutor = async (action, ...[value, intent]) => {
		if (!navigator.onLine || resources.error) {
			throw new UserError("Дождитесь синхронизации склада");
		}
		return mutation.mutateAsync({
			...warehouseCommandSchema.parse({ action, value }),
			operationId: intent?.operationId,
		});
	};
	const selection = useOrderSelection(resources.warehouse, execute);

	if (!resources.hasData) {
		return (
			<Modal title="Карточка заказа" onClose={selection.closeOrder}>
				{resources.error ? (
					<Feedback
						tone="error"
						action={<RetryButton onRetry={resources.retry} />}
					>
						{errorMessage(resources.error)}
					</Feedback>
				) : (
					<Feedback tone="loading">Загружаем данные склада…</Feedback>
				)}
			</Modal>
		);
	}

	return (
		<OrderDetailDialog
			model={selection}
			warehouse={resources.warehouse}
			pending={mutation.isPending || !!resources.error}
			execute={execute}
		/>
	);
}
