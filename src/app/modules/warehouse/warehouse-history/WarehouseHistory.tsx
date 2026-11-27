import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";

import { useHistoryPage } from "./model/useHistoryPage";
import { HistoryFilters } from "./ui/HistoryFilters/HistoryFilters";
import { HistoryTable } from "./ui/HistoryTable/HistoryTable";

function emptyMessage(isRangeValid: boolean, isEmpty: boolean) {
	if (!isRangeValid)
		return (
			<Feedback tone="error">
				Дата начала не должна быть позже даты окончания.
			</Feedback>
		);
	if (isEmpty) return "История операций пока пуста.";

	return "Нет событий с выбранными фильтрами.";
}

export function WarehouseHistory() {
	const model = useHistoryPage();
	const columns = useTableColumns("history", ["Раздел", "Когда"]);
	const toolbar = (
		<>
			{columns.button}
			<HistoryFilters model={model} />
		</>
	);

	return (
		<DataPanel
			empty={model.visibleEvents.length === 0}
			emptyMessage={emptyMessage(model.isRangeValid, model.isEmpty)}
			toolbar={toolbar}
		>
			<HistoryTable
				events={model.visibleEvents}
				timezone={model.timezone}
				hiddenColumns={columns.hiddenColumns}
			/>
		</DataPanel>
	);
}
