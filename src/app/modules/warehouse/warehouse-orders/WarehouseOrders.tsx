import { useMemo } from "react";

import type { CommandExecutor, CommandHandler } from "@/domain/warehouse";
import {
	useSandboxAccess,
	useSession,
	useWorkspaceMode,
} from "@/ports/session";
import { useLiveWarehouseScreen } from "@/ports/warehouse";
import { browserStorage, memoryStorage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";

import { OrderFormDrafts } from "./model/orderFormDrafts";
import { useOrderCreation } from "./model/useOrderCreation";
import { useOrderSelection } from "./model/useOrderSelection";
import { type OrdersPageOptions, useOrdersPage } from "./model/useOrdersPage";
import {
	type OrderScreenWarehouse,
	warehouseResources,
} from "./model/warehouseResources";
import { OrderCreationDialog } from "./ui/OrderCreationDialog/OrderCreationDialog";
import { OrderDetailDialog } from "./ui/OrderDetailDialog/OrderDetailDialog";
import { OrdersTable } from "./ui/OrdersTable/OrdersTable";
import { OrdersToolbar } from "./ui/OrdersToolbar/OrdersToolbar";

export function WarehouseOrders({ kind }: OrdersPageOptions) {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScreen(warehouseResources);
	const mode = useWorkspaceMode();
	const { user } = useSession();
	const sandbox = useSandboxAccess();
	const isSandbox = mode === "sandbox";
	const owner = isSandbox ? (sandbox.access?.access_id ?? "") : user;
	const identity = JSON.stringify([mode, owner, warehouse.id, kind]);
	const drafts = useMemo(() => {
		const storage = isSandbox
			? memoryStorage()
			: browserStorage("localStorage");
		const scope = [isSandbox ? "sandbox" : "account", owner];

		return new OrderFormDrafts(storage, scope, warehouse.id, kind);
	}, [isSandbox, owner, warehouse.id, kind]);

	return (
		<OrdersPageContent
			key={identity}
			kind={kind}
			warehouse={warehouse}
			execute={execute}
			command={command}
			isPending={pending}
			drafts={drafts}
		/>
	);
}

function OrdersPageContent({
	warehouse,
	execute,
	command,
	isPending,
	drafts,
	kind,
}: OrdersPageOptions & {
	warehouse: OrderScreenWarehouse;
	execute: CommandExecutor;
	command: CommandHandler;
	isPending: boolean;
	drafts: OrderFormDrafts;
}) {
	const model = useOrdersPage({ kind, warehouse, command });
	const { openCreation, ...creation } = useOrderCreation(
		warehouse,
		execute,
		drafts,
	);
	const { setDetail, ...detail } = useOrderSelection(warehouse, execute);
	const columns = useTableColumns(kind, [
		kind === "inbound" ? "Поставщик" : "Получатель",
		"Товаров",
		"Стоимость",
		"Создан",
		"Статус",
		"Действия",
	]);
	const isCreationIdle = !creation.creation && !creation.choosing;
	const hasReportFilters =
		model.unpriced || Boolean(model.from) || Boolean(model.to);
	const reportTitle = model.unpriced ? "Товары без цены" : "Из отчёта";
	const toolbar = (
		<OrdersToolbar
			filters={model.filters}
			kind={kind}
			canCreate={model.canCreate}
			onCreate={openCreation}
			columns={columns.button}
		/>
	);

	return (
		<>
			{isCreationIdle && <ErrorNotice message={creation.formError} />}
			{hasReportFilters && (
				<Feedback
					tone="info"
					inset
					action={
						<Button
							variant="text"
							size="sm"
							onClick={model.filters.resetFilters}
						>
							Сбросить фильтры отчёта
						</Button>
					}
				>
					{reportTitle}
					{model.from && ` · с ${model.from}`}
					{model.to && ` · по ${model.to}`}
				</Feedback>
			)}
			<DataPanel empty={model.isEmpty} toolbar={toolbar}>
				<OrdersTable
					hiddenColumns={columns.hiddenColumns}
					warehouse={warehouse}
					orders={model.visibleOrders}
					kind={kind}
					isPending={isPending}
					onDetail={setDetail}
					onStart={model.startOrder}
					onConfirm={model.confirmOrder}
				/>
			</DataPanel>
			<OrderCreationDialog
				model={creation}
				kind={kind}
				warehouse={warehouse}
				isPending={isPending}
			/>
			<OrderDetailDialog
				model={detail}
				warehouse={warehouse}
				isPending={isPending}
				execute={execute}
			/>
		</>
	);
}
