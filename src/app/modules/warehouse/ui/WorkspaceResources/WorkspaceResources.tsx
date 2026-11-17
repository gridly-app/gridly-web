import type { ReactNode } from "react";
import type { Warehouse } from "@/domain/warehouse";
import {
	useWarehouseResources,
	type WarehouseResource,
	WarehouseScopeProvider,
} from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { errorMessage, useOnlineStatus } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { ConnectionStatus } from "../ConnectionStatus/ConnectionStatus";
import { useWorkspaceCommands } from "../../model/workspace/content/useWorkspaceCommands";

export function WorkspaceResources({
	warehouse,
	isSnapshotStale,
	isSnapshotFetching,
	resources,
	children,
	loadingFallback,
}: {
	warehouse: Warehouse;
	isSnapshotStale: boolean;
	isSnapshotFetching: boolean;
	resources: WarehouseResource[];
	children: ReactNode;
	loadingFallback: ReactNode;
}) {
	const resource = useWarehouseResources(warehouse, resources);
	const online = useOnlineStatus();
	const commands = useWorkspaceCommands(warehouse.id, isSnapshotStale);
	const accessLost =
		resource.error instanceof ApiError && resource.error.status === 403;

	if (resource.loading && !accessLost) return loadingFallback;
	if (accessLost || (resource.error && !resource.hasData))
		return (
			<Feedback
				inset
				tone="error"
				title={
					accessLost ? "Доступ к разделу закрыт" : "Не удалось загрузить раздел"
				}
				action={
					<RetryButton variant="secondary" size="sm" onRetry={resource.retry} />
				}
			>
				{errorMessage(resource.error)}
			</Feedback>
		);
	return (
		<>
			<ConnectionStatus warehouseId={warehouse.id} />
			{resource.error && (
				<Feedback
					inset
					tone="warning"
					title="Не удалось обновить раздел"
					action={
						<RetryButton variant="secondary" size="sm" onRetry={resource.retry}>
							Повторить синхронизацию
						</RetryButton>
					}
				>
					Показаны последние загруженные данные.
				</Feedback>
			)}
			<WarehouseScopeProvider
				value={{
					...commands,
					warehouse: resource.warehouse,
					pending:
						commands.pending ||
						!online ||
						isSnapshotStale ||
						isSnapshotFetching ||
						resource.fetching ||
						!!resource.error,
				}}
			>
				{children}
			</WarehouseScopeProvider>
		</>
	);
}
