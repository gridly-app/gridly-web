import { useState } from "react";

import { saveFile } from "@/shared/http";

import {
	type CalendarColumn,
	type CalendarField,
	calendarColumns,
	fixedCalendarColumns,
} from "../../config/calendarColumns";
import { type CalendarSelection, calendarDetail } from "./calendarDetail";
import { hasInvalidDateRange, initialCalendarFilters } from "./calendarFilters";
import { calendarRows } from "./calendarRows";
import { defaultCalendarSort } from "./calendarSort";
import { calendarTotals } from "./calendarTotals";
import type { ShipmentCalendarOptions } from "./shipmentCalendarOptions";
import { shipmentCsv } from "./shipmentCsv";

export function useShipmentCalendar(options: ShipmentCalendarOptions) {
	const [filters, setFilters] = useState(initialCalendarFilters);
	const [showZeroActual, setShowZeroActual] = useState(true);
	const [hiddenColumns, setHiddenColumns] = useState<CalendarField[]>([]);
	const [sort, setSort] = useState(defaultCalendarSort);
	const [selection, setSelection] = useState<CalendarSelection>(null);
	const rows = calendarRows(options, filters, sort);
	const totals = calendarTotals(rows);
	const availableColumns: CalendarColumn[] = [];

	for (const [field, label] of calendarColumns) {
		if (field === "priority" && !options.showPriority) continue;

		const heading = field === "date" && filters.weekly ? "Неделя с" : label;

		availableColumns.push([field, heading]);
	}

	const visibleColumns = availableColumns.filter(
		([field]) => !hiddenColumns.includes(field),
	);
	const configurableColumns = availableColumns.filter(
		([field]) => !fixedCalendarColumns.includes(field),
	);
	const hasInvalidDates = hasInvalidDateRange(filters);
	const detail = calendarDetail(rows, selection);

	function changeColumn(field: CalendarField, checked: boolean) {
		setHiddenColumns((current) =>
			checked ? current.filter((name) => name !== field) : [...current, field],
		);

		if (!checked && sort.field === field) setSort(defaultCalendarSort);
	}

	function changeSort(field: CalendarField) {
		setSort((current) => ({
			field,
			ascending: current.field === field ? !current.ascending : true,
		}));
	}

	function selectRow(key: string) {
		setSelection({ kind: "row", key });
	}

	function selectTotal(unit: string) {
		setSelection({ kind: "total", unit });
	}

	function closeDetail() {
		setSelection(null);
	}

	function exportCsv() {
		const csv = shipmentCsv(
			visibleColumns.map(([, label]) => label),
			rows.map(({ cells }) => visibleColumns.map(([field]) => cells[field])),
		);
		const file = new Blob([csv], { type: "text/csv;charset=utf-8" });

		saveFile(file, "gridly-shipments.csv");
	}

	return {
		filters,
		setFilters,
		showZeroActual,
		setShowZeroActual,
		hiddenColumns,
		sort,
		rows,
		totals,
		visibleColumns,
		configurableColumns,
		hasInvalidDates,
		detail,
		changeColumn,
		changeSort,
		selectRow,
		selectTotal,
		closeDetail,
		exportCsv,
	};
}
