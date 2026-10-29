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
	catalog: ["catalog"],
	robots: ["robots"],
	inbound: ["orders", "catalog"],
	outbound: ["orders", "catalog"],
	inventory: ["inventory", "catalog", "map"],
	history: ["history"],
	settings: [],
	information: [],
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
			<Feedback role="alert" tone="error">
				{resource.error.message}
				<Button
					onClick={() => {
						void resource.retry();
					}}
				>
					Повторить
				</Button>
			</Feedback>
		);
	return (
		<>
			{resource.error && (
				<Feedback role="alert" tone="error">
					Не удалось обновить раздел. Показаны последние загруженные данные.
					<Button
						onClick={() => {
							void resource.retry();
						}}
					>
						Повторить синхронизацию
					</Button>
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
