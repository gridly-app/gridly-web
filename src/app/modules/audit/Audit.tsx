import { useMemo, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";
import { useWarehouses } from "@/ports/warehouse";
import { type FileHttpClient, isAccessDenied } from "@/shared/http";
import { dateRangeError } from "@/shared/lib";

import { useAuditEvents } from "./api/auditApi";
import { auditColumns } from "./config/auditColumns";
import { defaultAuditFilters } from "./model/filters/auditFilters";
import { auditQueryParams } from "./model/filters/auditQueryParams";
import { auditRow } from "./model/events/auditRow";
import { useAuditExport } from "./model/export/useAuditExport";
import { AuditEventDialog } from "./ui/details/AuditEventDialog/AuditEventDialog";
import { AuditFeedback } from "./ui/AuditFeedback/AuditFeedback";
import { AuditToolbar } from "./ui/list/AuditToolbar/AuditToolbar";

import { Button } from "@/shared/ui/controls";
import {
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

export function Audit({ http, path }: { http: FileHttpClient; path: string }) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const mode = useWorkspaceMode();
	const [filters, setFilters] = useState(defaultAuditFilters);
	const rangeError = dateRangeError(filters.from, filters.to);
	const warehouses = useWarehouses();
	const timeZone = warehouses.data?.find(
		({ id }) => id === filters.warehouse_id,
	)?.timezone;
	const params = rangeError ? "" : auditQueryParams(filters, timeZone);
	const { query, events, total } = useAuditEvents(http, path, {
		enabled: !rangeError,
		filters: params,
	});
	const columns = useMemo(() => auditColumns(mode, setSelectedId), [mode]);
	const rows = useMemo(() => events?.map(auditRow) ?? [], [events]);
	const selectedEvent = events?.find(({ id }) => id === selectedId);
	const isDenied = isAccessDenied(query.error);
	const { canExport, handleExport, exportError, isForbidden } = useAuditExport(
		http,
		{ path, mode },
		params,
		!rangeError && !isDenied,
	);
	const canShowEvents = Boolean(
		!rangeError && events && !isDenied && !isForbidden,
	);

	function handleRetry() {
		if (query.isFetchNextPageError) {
			void query.fetchNextPage();

			return;
		}

		void query.refetch();
	}

	function handleLoadMore() {
		void query.fetchNextPage({ cancelRefetch: false });
	}

	function handleChangeFilters(next: typeof filters) {
		setSelectedId(null);
		setFilters(next);
	}

	function handleCloseEvent() {
		setSelectedId(null);
	}

	return (
		<section className={styles.panel} aria-label="Журнал аудита">
			<AuditToolbar
				filters={filters}
				onChange={handleChangeFilters}
				canExport={canExport}
				onExport={handleExport}
			/>
			<AuditFeedback
				rangeError={rangeError}
				exportError={exportError}
				readError={query.error}
				isPending={query.isLoading}
				isForbidden={isDenied}
				onRetry={handleRetry}
			/>
			{canShowEvents && (
				<>
					<SortedTable
						label="События аудита"
						columns={columns}
						rowKey={({ event }) => event.id}
						rows={rows}
						descending
					/>
					<p className={styles.subtle} aria-live="polite">
						Найдено событий: {total}
					</p>
					{query.hasNextPage && (
						<Button
							variant="secondary"
							disabled={query.isFetching}
							onClick={handleLoadMore}
						>
							{query.isFetchingNextPage ? "Загружаем…" : "Загрузить ещё"}
						</Button>
					)}
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
