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

import { useWorkspaceCommands } from "../../model/workspace/content/useWorkspaceCommands";
import { ConnectionStatus } from "../ConnectionStatus/ConnectionStatus";

export function WorkspaceResources({
	warehouse,
	isSnapshotStale,
	isSnapshotFetching,
	resources,
	loadingFallback,
	children,
}: {
	warehouse: Warehouse;
	isSnapshotStale: boolean;
	isSnapshotFetching: boolean;
	resources: readonly WarehouseResource[];
	loadingFallback: ReactNode;
	children: ReactNode;
}) {
	const resource = useWarehouseResources(warehouse, resources);
	const isOnline = useOnlineStatus();
	const commands = useWorkspaceCommands(warehouse.id, isSnapshotStale);
	const accessLost =
		resource.error instanceof ApiError && resource.error.status === 403;
	const hasLoadError = Boolean(resource.error) && !resource.data;

	if (resource.loading && !accessLost) return loadingFallback;

	if (accessLost || hasLoadError) {
		const title = accessLost
			? "Доступ к разделу закрыт"
			: "Не удалось загрузить раздел";

		return (
			<Feedback
				inset
				tone="error"
				title={title}
				action={
					<RetryButton variant="secondary" size="sm" onRetry={resource.retry} />
				}
			>
				{errorMessage(resource.error)}
			</Feedback>
		);
	}

	if (!resource.data) return loadingFallback;

	const isPending =
		commands.pending ||
		!isOnline ||
		isSnapshotStale ||
		isSnapshotFetching ||
		resource.fetching ||
		resource.data.version !== warehouse.version ||
		Boolean(resource.error);
	const scope = {
		...commands,
		warehouse: resource.data,
		resources,
		pending: isPending,
	};

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
			<WarehouseScopeProvider value={scope}>{children}</WarehouseScopeProvider>
		</>
	);
}
