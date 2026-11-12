import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import { useInventoryPage } from "../model/useInventoryPage";
import { InventoryFilters } from "./InventoryFilters";
import { ExpectedDeliveriesTable } from "./tables/ExpectedDeliveriesTable";
import { InventoryTable } from "./tables/InventoryTable";
import { WriteOffsTable } from "./tables/WriteOffsTable";
import { WriteOffForm } from "./WriteOffForm";

export function InventoryPage() {
	const model = useInventoryPage();
	const warehouse = model.warehouse;
	const stockColumns = useTableColumns("stock", [
		"Зона",
		"Количество",
		"Резерв",
		"Годность",
		"Действия",
	]);
	const incomingColumns = useTableColumns("incoming", [
		"Ожидается",
		"Поставка / поставщик",
		"Срок",
	]);
	const writeOffColumns = useTableColumns("writeoffs", [
		"Списано",
		"Стоимость",
		"Дата",
		"Причина",
	]);
	const stockView = model.view === "stock";
	const writeOffView = model.view === "writeoffs";
	const columns = {
		stock: stockColumns,
		incoming: incomingColumns,
		writeoffs: writeOffColumns,
	}[model.view];
	const empty = stockView
		? model.visibleStock.length === 0
		: writeOffView
			? model.writeOffs.length === 0
			: model.expectedProducts.length === 0;
	const emptyMessage = writeOffView
		? !model.writeOffsAvailable
			? "Журнал списаний пока недоступен."
			: model.writeOffsEmpty
				? "Списаний пока нет."
				: "Списаний с выбранными фильтрами нет."
		: stockView
			? model.empty
				? "На складе пока нет остатков."
				: "Ничего не найдено. Измените поиск или фильтр."
			: "Ожидаемых поступлений с выбранными фильтрами нет.";
	return (
		<>
			{model.filter === "unpriced" && (
				<Feedback
					tone="info"
					inset
					action={
						<Button variant="text" size="sm" onClick={model.resetFilters}>
							Сбросить фильтры отчёта
						</Button>
					}
				>
					{writeOffView ? "Списания без цены" : "Остатки без цены"}
					{model.from && ` · с ${model.from}`}
					{model.to && ` · по ${model.to}`}
				</Feedback>
			)}
			<DataPanel
				empty={empty}
				emptyMessage={emptyMessage}
				toolbar={
					<>
						<SegmentedControl
							aria-label="Раздел остатков"
							value={model.view}
							onValueChange={model.changeView}
							items={[
								{ value: "stock", label: "На складе" },
								{ value: "incoming", label: "Ожидается" },
								{ value: "writeoffs", label: "Списания" },
							]}
						/>

						{columns.button}
						<InventoryFilters model={model} />
					</>
				}
			>
				{stockView && model.visibleStock.length > 0 && (
					<InventoryTable
						items={model.visibleStock}
						hiddenColumns={stockColumns.hiddenColumns}
						warehouse={warehouse}
						pending={model.pending}
						onWriteOff={model.openWriteOff}
						highlightUnpriced={model.filter === "unpriced"}
					/>
				)}
				{writeOffView &&
					model.writeOffsAvailable &&
					model.writeOffs.length > 0 && (
						<WriteOffsTable
							warehouse={warehouse}
							items={model.writeOffs}
							hiddenColumns={writeOffColumns.hiddenColumns}
							highlightUnpriced={model.filter === "unpriced"}
						/>
					)}
				{model.view === "incoming" && model.expectedProducts.length > 0 && (
					<ExpectedDeliveriesTable
						warehouse={warehouse}
						items={model.expectedProducts}
						hiddenColumns={incomingColumns.hiddenColumns}
					/>
				)}
			</DataPanel>
			{model.selected && (
				<Modal title="Списание партии" onClose={model.closeWriteOff}>
					<WriteOffForm
						stock={model.selected}
						pending={model.pending}
						onSave={model.writeOffStock}
					/>
				</Modal>
			)}
		</>
	);
}
