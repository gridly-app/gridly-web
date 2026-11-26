import { Navigate } from "react-router-dom";
import { warehousePath, newWarehouseId } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouses } from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";

export function WorkspaceEntry({
	preferredWarehouse,
}: {
	preferredWarehouse?: string;
}) {
	const mode = useWorkspaceMode();
	const warehouses = useWarehouses();
	if (warehouses.isPending)
		return <Skeleton layout="page" label="Загружаем склады…" />;
	if (warehouses.isError)
		return (
			<Feedback
				tone="error"
				title="Не удалось загрузить склады"
				action={
					<RetryButton
						variant="secondary"
						size="sm"
						onRetry={warehouses.refetch}
					/>
				}
			>
				{errorMessage(warehouses.error)}
			</Feedback>
		);

	const selected =
		warehouses.data.find(({ id }) => id === preferredWarehouse) ??
		warehouses.data[0];
	return (
		<Navigate
			replace
			to={warehousePath(mode, selected?.id ?? newWarehouseId)}
		/>
	);
}
