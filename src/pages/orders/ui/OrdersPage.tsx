import { useMemo } from "react";
import {
	type CommandExecutor,
	type CommandHandler,
	selectOrdersLive,
	useLiveWarehouseScope,
	type Warehouse,
} from "@/entities/warehouse";
import { useDemoSession, useSession, useWorkspaceMode } from "@/shared/auth";
import { browserStorage } from "@/shared/lib/browserStorage";
import {
	Button,
	DataPanel,
	ErrorNotice,
	Feedback,
	useTableColumns,
} from "@/shared/ui";
import { OrderFormDrafts } from "../model/orderFormDrafts";
import { useOrderDialogs } from "../model/useOrderDialogs";
import type { OrdersPageOptions } from "../model/useOrdersPage";
import { useOrdersPage } from "../model/useOrdersPage";
import { OrderCreationDialog } from "./OrderCreationDialog";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { OrdersTable } from "./OrdersTable";
import { OrdersToolbar } from "./OrdersToolbar";

export type OrdersPageProps = OrdersPageOptions;

export function OrdersPage(props: OrdersPageProps) {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectOrdersLive);
	const mode = useWorkspaceMode();
	const { user } = useSession();
	const demo = useDemoSession();
	const owner = mode === "demo" ? (demo.session?.session_id ?? "") : user;
	const identity = JSON.stringify([mode, owner, warehouse.id, props.kind]);
	const drafts = useMemo(
		() =>
			new OrderFormDrafts(
				browserStorage("localStorage"),
				[mode === "demo" ? "demo" : "account", owner],
				warehouse.id,
				props.kind,
			),
		[mode, owner, warehouse.id, props.kind],
	);
	return (
		<OrdersPageContent
			key={identity}
			{...props}
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
	...props
}: OrdersPageOptions & {
	warehouse: Warehouse;
	execute: CommandExecutor;
	command: CommandHandler;
	pending: boolean;
	drafts: OrderFormDrafts;
}) {
	const model = useOrdersPage({ ...props, warehouse, command, pending });
	const dialogs = useOrderDialogs(warehouse, execute, drafts);
	const columns = useTableColumns(props.kind, [
		props.kind === "inbound" ? "Поставщик" : "Получатель",
		"Товаров",
		"Стоимость",
		"Создан",
		"Статус",
		"Действия",
	]);

	return (
		<>
			{!dialogs.creation && !dialogs.choosing && (
				<ErrorNotice message={dialogs.formError} />
			)}
			{(model.unpriced || model.from || model.to) && (
				<Feedback
					tone="info"
					className="workspace-alert"
					action={
						<Button variant="text" size="sm" onClick={model.resetFilters}>
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
						model={{ ...model, openCreation: dialogs.openCreation }}
						columns={columns.button}
					/>
				}
			>
				<OrdersTable
					hiddenColumns={columns.hiddenColumns}
					warehouse={warehouse}
					model={{ ...model, setDetail: dialogs.setDetail }}
				/>
			</DataPanel>
			<OrderCreationDialog
				model={{ ...dialogs, page: props.kind, w: warehouse, pending }}
			/>
			<OrderDetailDialog
				model={{ ...dialogs, w: warehouse, pending, execute }}
			/>
		</>
	);
}
