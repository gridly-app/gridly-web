import { useMemo } from "react";
import {
	type CommandExecutor,
	type CommandHandler,
	useLiveWarehouseScope,
	type Warehouse,
} from "@/entities/warehouse";
import { useDemoSession, useSession, useWorkspaceMode } from "@/shared/auth";
import { browserStorage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";
import { OrderFormDrafts } from "../model/orderFormDrafts";
import { useOrderCreation } from "../model/useOrderCreation";
import { useOrderSelection } from "../model/useOrderSelection";
import type { OrdersPageOptions } from "../model/useOrdersPage";
import { useOrdersPage } from "../model/useOrdersPage";
import { OrderDetailDialog } from "./details/OrderDetailDialog";
import { OrderCreationDialog } from "./form/OrderCreationDialog";
import { OrdersToolbar } from "./OrdersToolbar";
import { OrdersTable } from "./table/OrdersTable";

export type OrdersPageProps = OrdersPageOptions;

export function OrdersPage({ kind }: OrdersPageProps) {
	const { warehouse, execute, command, pending } = useLiveWarehouseScope();
	const mode = useWorkspaceMode();
	const { user } = useSession();
	const demo = useDemoSession();
	const owner = mode === "demo" ? (demo.session?.session_id ?? "") : user;
	const identity = JSON.stringify([mode, owner, warehouse.id, kind]);
	const drafts = useMemo(
		() =>
			new OrderFormDrafts(
				browserStorage("localStorage"),
				[mode === "demo" ? "demo" : "account", owner],
				warehouse.id,
				kind,
			),
		[mode, owner, warehouse.id, kind],
	);
	return (
		<OrdersPageContent
			key={identity}
			kind={kind}
			warehouse={warehouse}
			execute={execute}
			command={command}
			pending={pending}
			drafts={drafts}
		/>
	);
}

function OrdersPageContent({
	warehouse,
	execute,
	command,
	pending,
	drafts,
	kind,
}: OrdersPageOptions & {
	warehouse: Warehouse;
	execute: CommandExecutor;
	command: CommandHandler;
	pending: boolean;
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

	return (
		<>
			{!creation.creation && !creation.choosing && (
				<ErrorNotice message={creation.formError} />
			)}
			{(model.unpriced || model.from || model.to) && (
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
					{model.unpriced ? "Товары без цены" : "Из отчёта"}
					{model.from && ` · с ${model.from}`}
					{model.to && ` · по ${model.to}`}
				</Feedback>
			)}
			<DataPanel
				empty={model.empty}
				toolbar={
					<OrdersToolbar
						filters={model.filters}
						kind={kind}
						canCreate={model.canCreate}
						onCreate={openCreation}
						columns={columns.button}
					/>
				}
			>
				<OrdersTable
					hiddenColumns={columns.hiddenColumns}
					warehouse={warehouse}
					orders={model.visibleOrders}
					kind={kind}
					pending={pending}
					onDetail={setDetail}
					onStart={model.startOrder}
					onConfirm={model.confirmOrder}
				/>
			</DataPanel>
			<OrderCreationDialog
				model={creation}
				kind={kind}
				warehouse={warehouse}
				pending={pending}
			/>
			<OrderDetailDialog
				model={detail}
				warehouse={warehouse}
				pending={pending}
				execute={execute}
			/>
		</>
	);
}
