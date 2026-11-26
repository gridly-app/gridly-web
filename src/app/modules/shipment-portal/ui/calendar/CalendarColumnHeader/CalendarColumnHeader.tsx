import { Button } from "@/shared/ui/controls";

import type {
	CalendarColumn,
	CalendarField,
} from "../../../config/calendarColumns";
import type { CalendarSort } from "../../../model/calendar/calendarSort";

export function CalendarColumnHeader({
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
