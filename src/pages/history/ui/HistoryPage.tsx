import { DataPanel, useTableColumns } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { useHistoryPage } from "../model/useHistoryPage";
import { HistoryFilters } from "./HistoryFilters";
import { HistoryTable } from "./HistoryTable";

export function HistoryPage() {
	const model = useHistoryPage();
	const columns = useTableColumns("history", ["Раздел", "Когда"]);
	return (
		<DataPanel
			empty={model.visibleEvents.length === 0}
			emptyMessage={
				!model.valid ? (
					<Feedback tone="error">
						Дата начала не должна быть позже даты окончания.
					</Feedback>
				) : model.empty ? (
					"История операций пока пуста."
				) : (
					"Нет событий с выбранными фильтрами."
				)
			}
			toolbar={
				<>
					{columns.button}
					<HistoryFilters model={model} />
				</>
			}
		>
			<HistoryTable
				events={model.visibleEvents}
				timezone={model.timezone}
				hiddenColumns={columns.hiddenColumns}
			/>
		</DataPanel>
	);
}
