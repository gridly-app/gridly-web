import type { ReactNode } from "react";
import type { Warehouse } from "@/domain/warehouse";
import {
	useWarehouseResources,
	type WarehouseResource,
	WarehouseScopeProvider,
} from "@/ports/warehouse";
import { errorMessage, useOnlineStatus } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { useWorkspaceCommands } from "./useWorkspaceCommands";

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

	if (resource.loading) return loadingFallback;
	if (resource.error && !resource.hasData)
		return (
			<Feedback
				inset
				tone="error"
				title="Не удалось загрузить раздел"
				action={
					<RetryButton variant="secondary" size="sm" onRetry={resource.retry} />
				}
			>
				{errorMessage(resource.error)}
			</Feedback>
		);
	return (
		<>
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
