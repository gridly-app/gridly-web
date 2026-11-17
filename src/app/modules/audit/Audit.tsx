import { useMemo, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { ApiError, type HttpClient } from "@/shared/http";
import { useAuditEvents } from "./api/auditApi";

import { useAuditExport } from "./model/useAuditExport";
import { useAuditTable } from "./model/useAuditTable";

import { AuditFeedback } from "./ui/AuditFeedback/AuditFeedback";

import { AuditPagination } from "./ui/AuditPagination/AuditPagination";
import { AuditToolbar } from "./ui/AuditToolbar/AuditToolbar";
import {
	SortableTable,
	managementStyles as styles,
} from "@/shared/ui/management";
import { AuditEventDialog } from "./ui/AuditEventDialog/AuditEventDialog";
import { auditColumns } from "./config/auditColumns";

export function Audit({ http, path }: { http: HttpClient; path: string }) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const mode = useWorkspaceMode();
	const { query, events, hasChanged, snapshot } = useAuditEvents(http, path);
	const columns = useMemo(() => auditColumns(mode, setSelectedId), [mode]);
	const table = useAuditTable(events, columns);
	const { rangeError } = table;
	const selectedEvent = events?.find(({ id }) => id === selectedId);

	const forbidden =
		query.error instanceof ApiError && query.error.status === 403;
	const unauthorized =
		query.error instanceof ApiError && query.error.status === 401;
	const canShowEvents = Boolean(
		!rangeError && events && !forbidden && !unauthorized,
	);
	const { canExport, handleExport, exportError, resetExport } = useAuditExport(
		http,
		path,
		mode,
		snapshot,
		table.sorted,
	);

	function handleRetry() {
		resetExport();
		table.resetPage();
		void query.refetch();
	}

	function handleCloseEvent() {
		setSelectedId(null);
	}

	return (
		<section className={styles.panel} aria-label="Журнал аудита">
			<AuditToolbar
				filters={table.filters}
				onChange={table.changeFilters}
				canExport={canExport}
				onExport={handleExport}
			/>
			<AuditFeedback
				rangeError={rangeError}
				exportError={exportError}
				readError={query.error}
				isPending={query.isPending}
				hasMore={query.hasNextPage}
				hasChanged={hasChanged}
				isForbidden={forbidden}
				onRetry={handleRetry}
			/>
			{canShowEvents && (
				<>
					<SortableTable
						label="События аудита"
						columns={columns}
						rowKey={({ event }) => event.id}
						rows={table.visibleRows}
						sort={table.sort}
						onSort={table.changeSort}
					/>
					<AuditPagination
						count={table.sorted.length}
						page={table.currentPage}
						pageSize={table.pageSize}
						onChange={table.setPage}
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
