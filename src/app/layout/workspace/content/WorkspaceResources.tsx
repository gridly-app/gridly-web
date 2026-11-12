import type { ReactNode } from "react";
import { useMatches } from "react-router-dom";
import type { WarehouseScope } from "@/entities/warehouse";
import {
	useWarehouseConnection,
	useWarehouseResources,
	type WarehouseResource,
	WarehouseScopeProvider,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

export interface WarehouseRouteHandle {
	resources: WarehouseResource[];
}

export function WorkspaceResources({
	scope,
	children,
}: {
	scope: WarehouseScope;
	children: ReactNode;
}) {
	const handle = useMatches().at(-1)?.handle as
		| WarehouseRouteHandle
		| undefined;
	const resource = useWarehouseResources(
		scope.warehouse,
		handle?.resources ?? [],
	);
	if (resource.loading)
		return <Feedback tone="loading">Загружаем раздел…</Feedback>;
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
			<ConnectionStatus warehouseId={scope.warehouse.id} />
			<WarehouseScopeProvider
				value={{
					...scope,
					warehouse: resource.warehouse,
					pending: scope.pending || resource.fetching || !!resource.error,
				}}
			>
				{children}
			</WarehouseScopeProvider>
		</>
	);
}

function ConnectionStatus({ warehouseId }: { warehouseId: string }) {
	const { data: disconnected } = useWarehouseConnection(warehouseId);
	if (!disconnected) return null;

	return (
		<Feedback inset tone="warning">
			Нет связи с потоком состояния склада. Данные могут быть устаревшими.
		</Feedback>
	);
}
