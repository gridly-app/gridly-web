import { useId } from "react";

import type {
	CalendarColumn,
	CalendarField,
} from "../../../config/calendarColumns";
import type { CalendarRow } from "../../../model/calendar/calendarRows";
import type { CalendarSort } from "../../../model/calendar/calendarSort";
import { CalendarColumnHeader } from "../CalendarColumnHeader/CalendarColumnHeader";
import { CalendarTableRow } from "../CalendarTableRow/CalendarTableRow";

import styles from "../../../shared.module.css";

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
							<CalendarColumnHeader
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
