import type {
	CalendarColumn,
	CalendarField,
} from "../../../config/calendarColumns";
import type { CalendarRow } from "../../../model/calendar/calendarRows";
import { ActualAmount } from "../ActualAmount/ActualAmount";

export function CalendarTableRow({
	row,
	columns,
	showZeroActual,
	onSelect,
}: {
	row: CalendarRow;
	columns: readonly CalendarColumn[];
	showZeroActual: boolean;
	onSelect: (key: string) => void;
}) {
	const factLabel = `Факт за ${row.cells.date}, ${row.cells.unit}`;

	function handleSelect() {
		onSelect(row.key);
	}

	function renderCell(field: CalendarField) {
		if (field === "actual") {
			return (
				<ActualAmount
					quantity={row.cells.actual}
					showZeroActual={showZeroActual}
					label={factLabel}
					onClick={handleSelect}
				/>
			);
		}

		if (field === "plan") return row.cells.plan ?? "Не запланировано";

		return row.cells[field] ?? "—";
	}

	return (
		<tr>
			{columns.map(([field]) => (
				<td key={field}>{renderCell(field)}</td>
			))}
		</tr>
	);
}
