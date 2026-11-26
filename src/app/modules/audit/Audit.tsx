import { useMemo, useState } from "react";

import { useWarehouses } from "@/ports/warehouse";
import { useWorkspaceMode } from "@/ports/session";

import { ApiError, type FetchHttpClient } from "@/shared/http";
import { useAuditEvents } from "./api/auditApi";

import { useAuditExport } from "./model/export/useAuditExport";
import { auditQueryParams, defaultAuditFilters } from "./model/filters/auditFilters";
import { auditRow } from "./model/auditPresentation";
import { dateRangeError } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";

import { AuditFeedback } from "./ui/AuditFeedback/AuditFeedback";

import { AuditToolbar } from "./ui/list/AuditToolbar/AuditToolbar";
import {
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";
import { AuditEventDialog } from "./ui/details/AuditEventDialog/AuditEventDialog";
import { auditColumns } from "./config/auditColumns";

export function Audit({ http, path }: { http: FetchHttpClient; path: string }) {
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
	const denied =
		query.error instanceof ApiError && [401, 403].includes(query.error.status);
	const { canExport, handleExport, exportError, isForbidden } = useAuditExport(
		http,
		path,
		params,
		!rangeError && !denied,
	);

	const canShowEvents = Boolean(
		!rangeError && events && !denied && !isForbidden,
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
				isForbidden={denied}
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
