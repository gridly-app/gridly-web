import { useState } from "react";

export type SortOrder = { id: string; descending: boolean };
export type SortValue = string | number | null;
export type SortColumn<Row> = { id: string; value?: (row: Row) => SortValue };

const collator = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
});

function compareValues(left: SortValue, right: SortValue, direction: number) {
	const leftMissing = left === null || Number.isNaN(left);
	const rightMissing = right === null || Number.isNaN(right);

	if (leftMissing || rightMissing)
		return Number(leftMissing) - Number(rightMissing);
	if (typeof left === "number" && typeof right === "number")
		return direction * (left - right);

	return direction * collator.compare(String(left), String(right));
}

export function sortTableRows<Row>(
	rows: Row[],
	getValue: SortColumn<Row>["value"],
	descending: boolean,
) {
	if (!getValue) return rows;

	const direction = descending ? -1 : 1;
	const rowsWithValues = rows.map((row) => ({ row, value: getValue(row) }));

	rowsWithValues.sort((left, right) =>
		compareValues(left.value, right.value, direction),
	);

	return rowsWithValues.map(({ row }) => row);
}

export function useTableSort(columnId: string, defaultDescending = false) {
	const [sort, setSort] = useState<SortOrder>({
		id: columnId,
		descending: defaultDescending,
	});

	function handleSort(id: string) {
		setSort((current) => ({
			id,
			descending: current.id === id && !current.descending,
		}));
	}

	return { sort, onSort: handleSort };
}
