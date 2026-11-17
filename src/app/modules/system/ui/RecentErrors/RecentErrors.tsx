import { useMemo, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { textSearchQuery, formatMoment } from "@/shared/lib";
import {
	systemErrorRows,
	systemErrorSearchIndexes,
} from "../../model/systemErrors";
import type { AuditEvent } from "@/domain/shipment";
import type { SystemError } from "../../api/system.dto";
import type {
	DescribeAuditEvent,
	RecentErrorAudit,
	RenderAuditEvents,
} from "../../model/auditContext";

import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";

import { SystemErrorDialog } from "../SystemErrorDialog/SystemErrorDialog";
import {
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

import sharedStyles from "../../shared.module.css";

import recentErrorsStyles from "./RecentErrors.module.css";

export type RecentErrorsInput = {
	items: SystemError[];
	orderEvents?: AuditEvent[] | undefined;
	search: string;
};

export function RecentErrors({
	items,
	orderEvents,
	search,
	audit,
	describeEvent,
	renderAuditEvents,
}: RecentErrorsInput & {
	audit: RecentErrorAudit;
	describeEvent: DescribeAuditEvent;
	renderAuditEvents: RenderAuditEvents;
}) {
	const [selected, setSelected] = useState<string | null>(null);
	const mode = useWorkspaceMode();
	const { events, isComplete: hasCompleteContext } = audit;
	const rows = useMemo(
		() =>
			systemErrorRows(
				items,
				[...(events ?? []), ...(orderEvents ?? [])],
				mode,
				describeEvent,
			),
		[items, events, orderEvents, mode, describeEvent],
	);
	const matches = textSearchQuery(search);
	const hasSearch = Boolean(matches);
	const indexedRows = useMemo(
		() => (hasSearch ? systemErrorSearchIndexes(rows, describeEvent) : []),
		[hasSearch, rows, describeEvent],
	);
	const visibleRows = matches
		? indexedRows.filter(({ index }) => matches(index)).map(({ row }) => row)
		: rows;

	const selectedRow = rows.find((row) => row.key === selected);
	const contextUnavailable = audit.isFetching ? (
		<Skeleton label="Ищем событие…" />
	) : (
		"Контекст операции недоступен"
	);

	function handleCloseError() {
		setSelected(null);
	}

	const columns: TableColumns<(typeof rows)[number]> = [
		{
			id: "date",
			label: "Дата и время",
			value: (row) => row.timestamp,
			cell: (row) => formatMoment(row.occurred_at),
		},
		{
			id: "error",
			label: "Ошибка",
			value: (row) => row.message,
			cell: (row) => (
				<>
					{row.message}
					<small className={styles.subtle}>{row.componentLabel}</small>
				</>
			),
		},
		{
			id: "context",
			label: "Что произошло",
			cell: (row) =>
				row.context ? (
					<div className={recentErrorsStyles.errorContext}>
						<strong>
							{row.context.area} · {row.context.event}
						</strong>
						<span>{row.context.description}</span>
						{!hasCompleteContext && (
							<small>Поиск по журналу не завершён.</small>
						)}
					</div>
				) : (
					contextUnavailable
				),
		},
		{
			id: "retry",
			label: "Повтор",
			value: (row) => row.retry_state ?? "—",
		},
		{
			id: "details",
			label: "Подробности",
			cell: (row) => {
				const label = row.events.length
					? "Связанные события"
					: "Подробности ошибки";

				function handleOpenError() {
					setSelected(row.key);
				}

				return (
					<Button size="sm" variant="secondary" onClick={handleOpenError}>
						{label}
					</Button>
				);
			},
		},
	];

	return (
		<section className={sharedStyles.group}>
			<h2 className={sharedStyles.groupTitle}>Последние ошибки</h2>
			{items.length ? (
				<>
					{audit.error && (
						<p>
							Не удалось загрузить связанные события.{" "}
							<RetryButton onRetry={audit.onRetry} />
						</p>
					)}
					{audit.canLoadAll && (
						<Button variant="secondary" onClick={audit.onLoadAll}>
							Искать связанные события во всём журнале
						</Button>
					)}
					{search && !hasCompleteContext && audit.canSearchContext && (
						<Feedback tone="info">
							Поиск по контексту ошибок пока неполный.
						</Feedback>
					)}
					<SortedTable
						label="Последние ошибки"
						descending
						rowKey={(row) => row.key}
						rows={visibleRows}
						columns={columns}
					/>
				</>
			) : (
				<p>Ошибок в списке нет.</p>
			)}
			{selectedRow && (
				<SystemErrorDialog
					row={selectedRow}
					isLoading={audit.isFetching}
					hasCompleteContext={hasCompleteContext}
					renderAuditEvents={renderAuditEvents}
					onClose={handleCloseError}
				/>
			)}
		</section>
	);
}
