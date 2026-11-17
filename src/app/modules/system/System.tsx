import { type ReactNode, useState } from "react";

import { useWorkspaceMode } from "@/ports/session";

import { ApiError, type FetchHttpClient } from "@/shared/http";
import { useSystemStatus } from "./api/systemApi";

import type { OrderLocation } from "@/ports/navigation";
import { textSearch, errorMessage } from "@/shared/lib";

import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { SystemComponents } from "./ui/SystemComponents/SystemComponents";
import { SystemJobs } from "./ui/SystemJobs/SystemJobs";
import type { RecentErrorsInput } from "./ui/RecentErrors/RecentErrors";
import type { RenderAuditEvents } from "./model/auditContext";
import { OrderDiagnostics } from "./ui/OrderDiagnostics/OrderDiagnostics";
import { SystemToolbar } from "./ui/SystemToolbar/SystemToolbar";
import { SystemMetrics } from "./ui/SystemMetrics/SystemMetrics";

import { managementStyles as styles } from "@/shared/ui/management";

export function System({
	http,
	path,
	orderScope,
	onRefreshAudit,
	renderAuditEvents,
	renderRecentErrors,
}: {
	http: FetchHttpClient;
	path: string;
	orderScope: OrderLocation | null;
	onRefreshAudit: () => void;
	renderAuditEvents: RenderAuditEvents;
	renderRecentErrors: (input: RecentErrorsInput) => ReactNode;
}) {
	const mode = useWorkspaceMode();
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const { query, rangeError } = useSystemStatus(http, path, {
		orderScope,
		from,
		to,
	});
	const forbidden =
		query.error instanceof ApiError && query.error.status === 403;
	const data = query.error || rangeError ? undefined : query.data;
	const matches = textSearch(search);
	const diagnostics = data?.order_diagnostics;
	const order =
		orderScope &&
		diagnostics?.warehouse_id === orderScope.warehouseId &&
		diagnostics.order_id === orderScope.orderId
			? diagnostics
			: undefined;

	const isOrderUnavailable = Boolean(data && orderScope && !order);
	const isRefreshDisabled = query.isFetching || Boolean(rangeError);

	function handleRefresh() {
		void query.refetch();
		onRefreshAudit();
	}

	return (
		<section className={styles.panel} aria-label="Состояние системы">
			<SystemToolbar
				search={search}
				from={from}
				to={to}
				isRefreshDisabled={isRefreshDisabled}
				onSearchChange={setSearch}
				onFromChange={setFrom}
				onToChange={setTo}
				onRefresh={handleRefresh}
			/>
			{rangeError && <Feedback tone="error">{rangeError}</Feedback>}
			{query.isPending && !rangeError && (
				<Feedback tone="loading">Проверяем состояние системы…</Feedback>
			)}
			{!rangeError && query.error && (
				<Feedback
					tone="error"
					action={
						forbidden ? undefined : <RetryButton onRetry={query.refetch} />
					}
				>
					{forbidden
						? "У аккаунта нет доступа к диагностике."
						: errorMessage(query.error)}
				</Feedback>
			)}
			{data && (
				<>
					{isOrderUnavailable && (
						<Feedback tone="warning">
							Диагностика этого заказа недоступна.
						</Feedback>
					)}
					<SystemMetrics data={data} />
					{order && (
						<OrderDiagnostics
							order={order}
							mode={mode}
							search={search}
							renderAuditEvents={renderAuditEvents}
						/>
					)}
					<SystemComponents components={data.components} matches={matches} />
					{renderRecentErrors({
						items: data.recent_errors,
						orderEvents: order?.recent_events,
						search,
					})}
					<SystemJobs jobs={data.jobs} matches={matches} />
				</>
			)}
		</section>
	);
}
