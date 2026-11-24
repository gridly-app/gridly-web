import { useId } from "react";
import { Button } from "@/shared/ui/controls";
import type {
	CalendarColumn,
	CalendarField,
	CalendarRow,
	CalendarSort,
} from "../../model/shipmentCalendarView";
import { ActualAmount } from "../ActualAmount/ActualAmount";

import styles from "../../shared.module.css";

type CalendarTableProps = {
	rows: CalendarRow[];
	columns: readonly CalendarColumn[];
	sort: CalendarSort;
	showZeroActual: boolean;
	onSort: (field: CalendarField) => void;
	onSelect: (key: string) => void;
};

export function CalendarTable({
	rows,
	columns,
	sort,
	showZeroActual,
	onSort,
	onSelect,
}: CalendarTableProps) {
	const captionId = useId();

	return (
		<section className={styles.scroll} aria-labelledby={captionId} tabIndex={0}>
			<table className={styles.table}>
				<caption id={captionId}>Таблица плана и факта</caption>
				<thead>
					<tr>
						{columns.map((column) => (
							<ColumnHeader
								key={column[0]}
								column={column}
								sort={sort}
								onSort={onSort}
							/>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<CalendarTableRow
							key={row.key}
							row={row}
							columns={columns}
							showZeroActual={showZeroActual}
							onSelect={onSelect}
						/>
					))}
				</tbody>
			</table>
		</section>
	);
}

function ColumnHeader({
	column: [field, label],
	sort,
	onSort,
}: {
	column: CalendarColumn;
	sort: CalendarSort;
	onSort: (field: CalendarField) => void;
}) {
	const isSorted = sort.field === field;
	const direction = sort.ascending ? "ascending" : "descending";
	const ariaSort = isSorted ? direction : undefined;
	const sortArrow = sort.ascending ? " ↑" : " ↓";

	function handleSort() {
		onSort(field);
	}

	return (
		<th scope="col" aria-sort={ariaSort}>
			<Button variant="ghost" size="sm" type="button" onClick={handleSort}>
				{label}
				{isSorted && <span aria-hidden="true">{sortArrow}</span>}
			</Button>
		</th>
	);
}

function CalendarTableRow({
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
