import { useMemo, useState } from "react";

import type { AuditEvent } from "@/domain/shipment";
import { dateRangeError } from "@/shared/lib";
import {
	sortTableRows,
	type TableColumns,
	useTableSort,
} from "@/shared/ui/management";

import {
	type AuditFilters,
	defaultAuditFilters,
	filterAuditRows,
} from "./auditFilters";
import { auditRow, type AuditRow } from "./auditPresentation";

const pageSize = 50;

export function useAuditTable(
	events: AuditEvent[] | undefined,
	columns: TableColumns<AuditRow>,
) {
	const [filters, setFilters] = useState(defaultAuditFilters);
	const [page, setPage] = useState(0);
	const { sort, onSort } = useTableSort("date", true);
	const rangeError = dateRangeError(filters.from, filters.to);
	const allRows = useMemo(() => events?.map(auditRow) ?? [], [events]);
	const rows = useMemo(
		() => (rangeError ? [] : filterAuditRows(allRows, filters)),
		[allRows, filters, rangeError],
	);
	const sortValue = columns.find(({ id }) => id === sort.id)?.value;
	const sorted = useMemo(
		() => sortTableRows(rows, sortValue, sort.descending),
		[rows, sortValue, sort.descending],
	);
	const currentPage = Math.min(
		page,
		Math.max(0, Math.ceil(rows.length / pageSize) - 1),
	);
	const visibleRows = sorted.slice(
		currentPage * pageSize,
		(currentPage + 1) * pageSize,
	);

	function resetPage() {
		setPage(0);
	}

	function changeFilters(next: AuditFilters) {
		setFilters(next);
		resetPage();
	}

	function changeSort(id: string) {
		onSort(id);
		resetPage();
	}

	return {
		filters,
		changeFilters,
		rangeError,
		sort,
		changeSort,
		sorted,
		visibleRows,
		currentPage,
		pageSize,
		setPage,
		resetPage,
	};
}
