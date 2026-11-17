import { useCallback, useMemo, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { ApiError, type FetchHttpClient, saveFile } from "@/shared/http";
import { useAuditEvents, useVerifyAuditExport } from "./api/auditApi";

import {
	type AuditFilters,
	defaultAuditFilters,
	filterAuditRows,
} from "./model/auditFilters";
import { dateRangeError, errorMessage } from "@/shared/lib";
import { auditCsv } from "./model/auditCsv";
import { auditRow } from "./model/auditPresentation";
import type { AuditEvent } from "@/domain/shipment";

import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { AuditPagination } from "./ui/AuditPagination/AuditPagination";
import { AuditToolbar } from "./ui/AuditToolbar/AuditToolbar";
import {
	SortableTable,
	sortTableRows,
	useTableSort,
	managementStyles as styles,
} from "@/shared/ui/management";
import { AuditEventDialog } from "./ui/AuditEventDialog/AuditEventDialog";
import { auditColumns } from "./ui/AuditEvents/AuditEvents";

const pageSize = 50;

export function Audit({ http, path }: { http: FetchHttpClient; path: string }) {
	const [filters, setFilters] = useState(defaultAuditFilters);
	const [page, setPage] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const mode = useWorkspaceMode();
	const { query, events, hasChanged } = useAuditEvents(http, path);
	const verifyExport = useVerifyAuditExport(http, path);
	const loadedEvents = events;
	const allRows = useMemo(
		() => loadedEvents?.map(auditRow) ?? [],
		[loadedEvents],
	);
	const rangeError = dateRangeError(filters.from, filters.to);
	const rows = useMemo(
		() => (rangeError ? [] : filterAuditRows(allRows, filters)),
		[allRows, filters, rangeError],
	);
	const handleOpenEvent = useCallback(
		(event: AuditEvent) => setSelectedId(event.id),
		[],
	);
	const columns = useMemo(
		() => auditColumns(mode, handleOpenEvent),
		[mode, handleOpenEvent],
	);
	const selectedEvent = loadedEvents?.find(({ id }) => id === selectedId);
	const { sort, onSort } = useTableSort(columns[0].id, true);
	const sortValue = columns.find(({ id }) => id === sort.id)?.value;
	const sorted = useMemo(
		() => sortTableRows(rows, sortValue, sort.descending),
		[rows, sortValue, sort.descending],
	);
	const currentPage = Math.min(
		page,
		Math.max(0, Math.ceil(rows.length / pageSize) - 1),
	);

	const forbidden =
		query.error instanceof ApiError && query.error.status === 403;
	const unauthorized =
		query.error instanceof ApiError && query.error.status === 401;
	const canShowEvents = Boolean(
		!rangeError && loadedEvents && !forbidden && !unauthorized,
	);
	const pages = query.data?.pages;
	const canExport = Boolean(
		pages?.length &&
		rows.length &&
		!query.hasNextPage &&
		!query.isFetching &&
		!query.error &&
		!hasChanged &&
		!verifyExport.isPending &&
		!verifyExport.error,
	);

	const visibleRows = sorted.slice(
		currentPage * pageSize,
		(currentPage + 1) * pageSize,
	);

	function handleRetry() {
		verifyExport.reset();
		setPage(0);
		void query.refetch();
	}

	function handleFiltersChange(next: AuditFilters) {
		setFilters(next);
		setPage(0);
	}

	function handleSort(id: string) {
		onSort(id);
		setPage(0);
	}

	function handleCloseEvent() {
		setSelectedId(null);
	}

	function handleExport() {
		if (!canExport || !pages) return;

		const filename =
			mode === "sandbox"
				? "sandbox-shipment-audit.csv"
				: "gridly-shipment-audit.csv";

		verifyExport.mutate(pages, {
			onSuccess: () => {
				const file = new Blob(["\uFEFF", auditCsv(sorted)], {
					type: "text/csv;charset=utf-8",
				});

				saveFile(file, filename);
			},
		});
	}

	return (
		<section className={styles.panel} aria-label="Журнал аудита">
			<AuditToolbar
				filters={filters}
				onChange={handleFiltersChange}
				canExport={canExport}
				onExport={handleExport}
			/>
			{rangeError && <Feedback tone="error">{rangeError}</Feedback>}
			{verifyExport.error && (
				<Feedback tone="error" action={<RetryButton onRetry={handleRetry} />}>
					{errorMessage(verifyExport.error)}
				</Feedback>
			)}
			{!rangeError && query.isPending && (
				<Feedback tone="loading">Загружаем журнал…</Feedback>
			)}
			{!rangeError && query.error && (
				<Feedback
					tone="error"
					action={forbidden ? undefined : <RetryButton onRetry={handleRetry} />}
				>
					{forbidden
						? "У аккаунта нет доступа к журналу аудита."
						: errorMessage(query.error)}
				</Feedback>
			)}
			{!rangeError && query.hasNextPage && !query.error && (
				<Feedback tone="info">
					Загружаем остальные события. Результаты пока неполные.
				</Feedback>
			)}
			{!rangeError && hasChanged && !query.error && (
				<Feedback tone="warning" action={<RetryButton onRetry={handleRetry} />}>
					Журнал изменился во время чтения. Обновите его перед экспортом.
				</Feedback>
			)}
			{canShowEvents && (
				<>
					<SortableTable
						label="События аудита"
						columns={columns}
						rowKey={({ event }) => event.id}
						rows={visibleRows}
						sort={sort}
						onSort={handleSort}
					/>
					<AuditPagination
						count={rows.length}
						page={currentPage}
						pageSize={pageSize}
						onChange={setPage}
					/>
					{selectedEvent && (
						<AuditEventDialog
							event={selectedEvent}
							onClose={handleCloseEvent}
						/>
					)}
				</>
			)}
		</section>
	);
}
