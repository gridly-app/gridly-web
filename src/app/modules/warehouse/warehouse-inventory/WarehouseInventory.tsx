import { Button } from "@/shared/ui/controls";
import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";

import { useInventoryPage } from "./model/useInventoryPage";
import { ExpectedDeliveriesTable } from "./ui/ExpectedDeliveriesTable/ExpectedDeliveriesTable";
import { InventoryFilters } from "./ui/InventoryFilters/InventoryFilters";
import { InventoryTable } from "./ui/InventoryTable/InventoryTable";
import { WriteOffForm } from "./ui/WriteOffForm/WriteOffForm";
import { WriteOffsTable } from "./ui/WriteOffsTable/WriteOffsTable";

type InventoryModel = ReturnType<typeof useInventoryPage>;

const viewItems = [
	{ value: "stock", label: "На складе" },
	{ value: "incoming", label: "Ожидается" },
	{ value: "writeoffs", label: "Списания" },
] as const;

function visibleCount(model: InventoryModel) {
	const counts = {
		stock: model.visibleStock.length,
		incoming: model.expectedProducts.length,
		writeoffs: model.writeOffs.length,
	};

	return counts[model.view];
}

function emptyMessage(model: InventoryModel) {
	if (model.view === "incoming")
		return "Ожидаемых поступлений с выбранными фильтрами нет.";

	if (model.view === "stock") {
		return model.isStockEmpty
			? "На складе пока нет остатков."
			: "Ничего не найдено. Измените поиск или фильтр.";
	}

	if (!model.hasWriteOffLog) return "Журнал списаний пока недоступен.";
	if (model.isWriteOffLogEmpty) return "Списаний пока нет.";

	return "Списаний с выбранными фильтрами нет.";
}

export function WarehouseInventory() {
	const model = useInventoryPage();
	const { warehouse, view } = model;
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
	const columns = {
		stock: stockColumns,
		incoming: incomingColumns,
		writeoffs: writeOffColumns,
	}[view];
	const isUnpricedFilter = model.filter === "unpriced";
	const hasRows = visibleCount(model) > 0;
	const unpricedTitle =
		view === "writeoffs" ? "Списания без цены" : "Остатки без цены";
	const toolbar = (
		<>
			<SegmentedControl
				aria-label="Раздел остатков"
				value={view}
				onValueChange={model.changeView}
				items={viewItems}
			/>
			{columns.button}
			<InventoryFilters model={model} />
		</>
	);

	return (
		<>
			{isUnpricedFilter && (
				<Feedback
					tone="info"
					inset
					action={
						<Button variant="text" size="sm" onClick={model.resetFilters}>
							Сбросить фильтры отчёта
						</Button>
					}
				>
					{unpricedTitle}
					{model.from && ` · с ${model.from}`}
					{model.to && ` · по ${model.to}`}
				</Feedback>
			)}
			<DataPanel
				empty={!hasRows}
				emptyMessage={emptyMessage(model)}
				toolbar={toolbar}
			>
				{view === "stock" && hasRows && (
					<InventoryTable
						items={model.visibleStock}
						hiddenColumns={stockColumns.hiddenColumns}
						warehouse={warehouse}
						isPending={model.pending}
						isUnpricedHighlighted={isUnpricedFilter}
						onWriteOff={model.openWriteOff}
					/>
				)}
				{view === "writeoffs" && model.hasWriteOffLog && hasRows && (
					<WriteOffsTable
						warehouse={warehouse}
						items={model.writeOffs}
						hiddenColumns={writeOffColumns.hiddenColumns}
						isUnpricedHighlighted={isUnpricedFilter}
					/>
				)}
				{view === "incoming" && hasRows && (
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
						isPending={model.pending}
						onSave={model.writeOffStock}
					/>
				</Modal>
			)}
		</>
	);
}
