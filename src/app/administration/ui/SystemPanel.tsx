import {
	IconActivity,
	IconAlertTriangle,
	IconClock,
	IconRefresh,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { shipmentManagementPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type FetchHttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Badge, Card, ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { DateRangeFields } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import { adminMoment } from "../model/auditPresentation";
import { auditPath, systemSchema } from "../model/shipmentAudit";
import { SortedAdminTable } from "./AdminTable";
import { AuditEvents } from "./AuditPanel";
import { RecentErrors } from "./RecentErrors";

const statuses = {
	ok: "Доступен",
	degraded: "Работает с ошибками",
	unavailable: "Недоступен",
};
const componentTones = {
	ok: "success",
	degraded: "warning",
	unavailable: "danger",
} as const;
const jobTones: Record<string, "success" | "warning" | "danger" | "neutral"> = {
	running: "success",
	pending: "neutral",
	completed: "success",
	failed: "danger",
};
const componentNames: Record<string, string> = {
	api: "Сервис отгрузок",
	warehouse: "Складской сервис",
};
const jobStatuses: Record<string, string> = {
	running: "Выполняется",
	pending: "Ожидает",
	completed: "Завершена",
	failed: "Ошибка",
};
const componentName = (code: string) =>
	componentNames[code] ?? "Компонент системы";

export function SystemPanel({
	http,
	path,
	warehouseId,
	orderId,
}: {
	http: FetchHttpClient;
	path: string;
	warehouseId: string;
	orderId: string;
}) {
	const mode = useWorkspaceMode();
	const queryClient = useQueryClient();
	const auditEndpoint = mode === "sandbox" ? `/sandbox${auditPath}` : auditPath;
	const [search, setSearch] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const params = new URLSearchParams();
	if (warehouseId && orderId) {
		params.set("warehouse_id", warehouseId);
		params.set("order_id", orderId);
	}
	if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
	if (to) {
		const nextDay = new Date(`${to}T00:00:00`);
		nextDay.setDate(nextDay.getDate() + 1);
		params.set("to", nextDay.toISOString());
	}
	const invalidRange = !!from && !!to && from > to;
	const url = `${path}?${params}`;
	const scopeId = useWarehouseScopeId();
	const query = useQuery({
		queryKey: [scopeId, "shipment-admin", url],
		queryFn: async ({ signal }) =>
			parseResponse(systemSchema, await http.request(url, { signal })),
		enabled: !invalidRange,
		retry: false,
	});
	const forbidden =
		query.error instanceof ApiError && query.error.status === 403;
	const data = query.error || invalidRange ? undefined : query.data;
	const matches = adminSearch(search);
	const order = data?.order_diagnostics;
	const available =
		data?.components.filter((component) => component.status === "ok").length ??
		0;
	const activeJobs =
		data?.jobs.filter(
			(job) => job.status === "running" || job.status === "pending",
		).length ?? 0;

	return (
		<section className={styles.panel} aria-label="Состояние системы">
			<div className={styles.toolbar}>
				<ListFilters
					search={{
						"aria-label": "Поиск по диагностике",
						value: search,
						onChange: setSearch,
					}}
					count={Number(!!from) + Number(!!to)}
					onReset={() => {
						setFrom("");
						setTo("");
					}}
				>
					<DateRangeFields
						from={from}
						to={to}
						onFromChange={setFrom}
						onToChange={setTo}
					/>
				</ListFilters>
				<Button
					variant="default"
					disabled={query.isFetching || invalidRange}
					onClick={() => {
						void query.refetch();
						void queryClient.invalidateQueries({
							queryKey: [scopeId, "shipment-admin", auditEndpoint],
							exact: true,
						});
					}}
				>
					<IconRefresh size={16} aria-hidden="true" /> Обновить
				</Button>
			</div>
			{invalidRange && (
				<Feedback tone="error">
					Дата окончания должна быть не раньше даты начала.
				</Feedback>
			)}
			{query.isPending && !invalidRange && (
				<Feedback tone="loading">Проверяем состояние системы…</Feedback>
			)}
			{query.error && (
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
					<div className={styles.metrics}>
						<Card className={styles.metric}>
							<span className={styles.actions}>
								<IconActivity size={18} aria-hidden="true" /> Источники в норме
							</span>
							<strong>
								{available} / {data.components.length}
							</strong>
						</Card>
						<Card className={styles.metric}>
							<span className={styles.actions}>
								<IconAlertTriangle size={18} aria-hidden="true" /> Ошибки за
								период
							</span>
							<strong>{data.error_count}</strong>
						</Card>
						<Card className={styles.metric}>
							<span className={styles.actions}>
								<IconClock size={18} aria-hidden="true" /> Активные задачи
							</span>
							<strong>{activeJobs}</strong>
						</Card>
					</div>
					<span className={styles.subtle}>
						Последняя проверка · {adminMoment(data.checked_at)}
					</span>
					{warehouseId && orderId && (
						<div className={styles.actions}>
							<Link
								to={`?${new URLSearchParams({ tab: "system", warehouse_id: warehouseId, order_id: orderId, order: orderId })}`}
							>
								Открыть заказ
							</Link>
							{mode === "standard" && (
								<Link to={shipmentManagementPath(warehouseId, orderId)}>
									Управление отгрузкой
								</Link>
							)}
							<Link
								to={`?tab=links&${new URLSearchParams({ warehouse_id: warehouseId, order_id: orderId })}`}
							>
								Настроить гостевой доступ
							</Link>
						</div>
					)}
					{order && (
						<section className={styles.group}>
							<h2>
								{order.order_number
									? `Заказ ${order.order_number}`
									: "Диагностика заказа"}
							</h2>
							<p>
								{order.warehouse_name && `${order.warehouse_name} · `}Снимок
								обновлён {adminMoment(order.updated_at, order.time_zone)}
							</p>
							<AuditEvents items={order.recent_events} search={search} />
						</section>
					)}
					<section className={styles.group}>
						<h2>Источники данных</h2>
						<SortedAdminTable
							label="Источники данных"
							rowKey={(row) => row.code}
							rows={data.components.filter((row) =>
								matches([
									row.name ?? componentName(row.code),
									statuses[row.status],
									adminMoment(row.last_success_at),
									String(row.lag_seconds ?? ""),
								]),
							)}
							columns={[
								{
									label: "Компонент",
									value: (row) => row.name ?? componentName(row.code),
								},
								{
									label: "Доступность",
									value: (row) => statuses[row.status],
									cell: (row) => (
										<Badge tone={componentTones[row.status]}>
											{statuses[row.status]}
										</Badge>
									),
								},
								{
									label: "Последнее обновление",
									value: (row) => row.last_success_at ?? "",
									cell: (row) => adminMoment(row.last_success_at),
								},
								{
									label: "Задержка",
									value: (row) => row.lag_seconds ?? -1,
									cell: (row) =>
										row.lag_seconds === null
											? "Нет данных"
											: `${row.lag_seconds} с`,
								},
							]}
						/>
					</section>
					<RecentErrors
						http={http}
						auditPath={auditEndpoint}
						items={data.recent_errors}
						orderEvents={order?.recent_events}
						matches={matches}
						componentName={componentName}
					/>
					<section className={styles.group}>
						<h2>Фоновые задачи</h2>
						{data.jobs.length ? (
							<SortedAdminTable
								label="Фоновые задачи"
								rowKey={(row) => row.id}
								rows={data.jobs.filter((row) =>
									matches([
										row.name ?? "Фоновая задача",
										jobStatuses[row.status] ?? "Нет сведений",
										adminMoment(row.started_at),
									]),
								)}
								columns={[
									{
										label: "Задача",
										value: (row) => row.name ?? "Фоновая задача",
									},
									{
										label: "Статус",
										value: (row) => jobStatuses[row.status] ?? "Нет сведений",
										cell: (row) => (
											<Badge tone={jobTones[row.status] ?? "neutral"}>
												{jobStatuses[row.status] ?? "Нет сведений"}
											</Badge>
										),
									},
									{
										label: "Запущена",
										value: (row) => row.started_at ?? "",
										cell: (row) => adminMoment(row.started_at),
									},
								]}
							/>
						) : (
							<p>Текущих фоновых задач нет.</p>
						)}
					</section>
				</>
			)}
		</section>
	);
}
