import { type ReactNode, useState } from "react";

import { newWarehouseId, type OrderLocation } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouse } from "@/ports/warehouse";
import { ApiError, type HttpClient, isAccessDenied } from "@/shared/http";
import { errorMessage, textSearch } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { managementStyles as styles } from "@/shared/ui/management";

import type { SystemStatus } from "./api/system.dto";
import { useSystemStatus } from "./api/systemApi";
import type { RenderAuditEvents } from "./model/auditContext";
import { OrderDiagnostics } from "./ui/OrderDiagnostics/OrderDiagnostics";
import type { RecentErrorsInput } from "./ui/RecentErrors/RecentErrors";
import { SystemComponents } from "./ui/SystemComponents/SystemComponents";
import { SystemJobs } from "./ui/SystemJobs/SystemJobs";
import { SystemMetrics } from "./ui/SystemMetrics/SystemMetrics";
import { SystemToolbar } from "./ui/SystemToolbar/SystemToolbar";

function scopedDiagnostics(
	data: SystemStatus | undefined,
	orderScope: OrderLocation | null,
) {
	const diagnostics = data?.order_diagnostics;
	const isScopedOrder =
		diagnostics?.warehouse_id === orderScope?.warehouseId &&
		diagnostics?.order_id === orderScope?.orderId;

	return orderScope && diagnostics && isScopedOrder ? diagnostics : undefined;
}

export function System({
	http,
	path,
	orderScope,
	onRefreshAudit,
	renderAuditEvents,
	renderRecentErrors,
}: {
	http: HttpClient;
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
	const warehouse = useWarehouse(orderScope?.warehouseId ?? newWarehouseId);
	const timeZone = orderScope
		? warehouse.data?.timezone
		: Intl.DateTimeFormat().resolvedOptions().timeZone;
	const { query, rangeError } = useSystemStatus(http, path, {
		orderScope,
		from,
		to,
		timeZone,
	});
	const isForbidden =
		query.error instanceof ApiError && query.error.status === 403;
	const data =
		isAccessDenied(query.error) || rangeError ? undefined : query.data;
	const hasRefreshError = Boolean(data) && Boolean(query.error);
	const hasLoadError = !rangeError && Boolean(query.error) && !hasRefreshError;
	const matches = textSearch(search);
	const order = scopedDiagnostics(data, orderScope);
	const isOrderUnavailable = Boolean(data && orderScope && !order);
	const isRefreshDisabled = query.isFetching || Boolean(rangeError);
	const loadErrorMessage = isForbidden
		? "У аккаунта нет доступа к диагностике."
		: errorMessage(query.error);
	const loadErrorAction = isForbidden ? undefined : (
		<RetryButton onRetry={query.refetch} />
	);

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
				timeZone={timeZone}
				isRefreshDisabled={isRefreshDisabled}
				onSearchChange={setSearch}
				onFromChange={setFrom}
				onToChange={setTo}
				onRefresh={handleRefresh}
			/>
			{rangeError && <Feedback tone="error">{rangeError}</Feedback>}
			{!from && !to && (
				<p className={styles.subtle}>
					История ошибок за последние 24 часа. Статус компонентов отражает
					последнюю проверку.
				</p>
			)}
			{query.isPending && !rangeError && (
				<Feedback tone="loading">Проверяем состояние системы…</Feedback>
			)}
			{hasLoadError && (
				<Feedback tone="error" action={loadErrorAction}>
					{loadErrorMessage}
				</Feedback>
			)}
			{hasRefreshError && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={query.refetch} />}
				>
					Не удалось обновить данные. Показаны последние загруженные данные.
				</Feedback>
			)}
			{data && (
				<SystemReport
					data={data}
					order={order}
					isOrderUnavailable={isOrderUnavailable}
					search={search}
					matches={matches}
					mode={mode}
					renderAuditEvents={renderAuditEvents}
					renderRecentErrors={renderRecentErrors}
				/>
			)}
		</section>
	);
}

function SystemReport({
	data,
	order,
	isOrderUnavailable,
	search,
	matches,
	mode,
	renderAuditEvents,
	renderRecentErrors,
}: {
	data: SystemStatus;
	order: ReturnType<typeof scopedDiagnostics>;
	isOrderUnavailable: boolean;
	search: string;
	matches: (values: string[]) => boolean;
	mode: ReturnType<typeof useWorkspaceMode>;
	renderAuditEvents: RenderAuditEvents;
	renderRecentErrors: (input: RecentErrorsInput) => ReactNode;
}) {
	const isErrorListTruncated = data.error_count > data.recent_errors.length;

	return (
		<>
			{isOrderUnavailable && (
				<Feedback tone="warning">Диагностика этого заказа недоступна.</Feedback>
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
			{isErrorListTruncated && (
				<p className={styles.subtle}>
					Показаны последние {data.recent_errors.length} из {data.error_count}{" "}
					ошибок за период.
				</p>
			)}
			{renderRecentErrors({
				items: data.recent_errors,
				orderEvents: order?.recent_events,
				search,
			})}
			<SystemJobs jobs={data.jobs} matches={matches} />
		</>
	);
}
