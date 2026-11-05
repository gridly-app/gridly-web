import type { ReactNode } from "react";
import type { WarehouseScope } from "@/entities/warehouse";
import {
	useWarehouseResources,
	type WarehouseResource,
	WarehouseScopeProvider,
} from "@/entities/warehouse";
import { Button, Feedback } from "@/shared/ui";

const pageResources: Record<string, WarehouseResource[]> = {
	map: ["map", "catalog"],
	catalog: ["catalog", "inventory"],
	robots: ["robots", "orders", "catalog"],
	inbound: ["orders", "catalog", "robots"],
	outbound: ["orders", "catalog", "robots"],
	inventory: ["inventory", "catalog", "map", "orders", "robots", "history"],
	history: ["history"],
	settings: ["map", "catalog", "robots", "orders", "inventory"],
	information: ["orders", "catalog", "inventory", "history"],
	warehouses: [],
};

export function WorkspaceResources({
	scope,
	page,
	children,
}: {
	scope: WarehouseScope;
	page: string;
	children: ReactNode;
}) {
	const resource = useWarehouseResources(
		scope.warehouse,
		pageResources[page] ?? [],
	);
	if (resource.loading)
		return <Feedback tone="loading">Загружаем раздел…</Feedback>;
	if (resource.error && !resource.hasData)
		return (
			<Feedback
				className="workspace-alert"
				tone="error"
				title="Не удалось загрузить раздел"
				action={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void resource.retry();
						}}
					>
						Повторить
					</Button>
				}
			>
				{resource.error.message}
			</Feedback>
		);
	return (
		<>
			{resource.error && (
				<Feedback
					className="workspace-alert"
					tone="warning"
					title="Не удалось обновить раздел"
					action={
						<Button
							variant="secondary"
							size="sm"
							onClick={() => {
								void resource.retry();
							}}
						>
							Повторить синхронизацию
						</Button>
					}
				>
					Показаны последние загруженные данные.
				</Feedback>
			)}
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
