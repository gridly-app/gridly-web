import { useState } from "react";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { ApiError, type FetchHttpClient, saveFile } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Badge, ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { DateRangeFields, Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import {
	adminDateKey,
	auditArea,
	auditAreaLabels,
	auditSummary,
	changeLabel,
	changeValue,
	permissionChanges,
} from "../model/auditPresentation";
import type { AuditEvent } from "../model/shipmentAudit";
import { useAuditEvents } from "../model/useAuditEvents";
import {
	type AdminColumn,
	AdminTable,
	SortedAdminTable,
	useAdminSort,
} from "./AdminTable";

const pageSize = 50;
function csvCell(value: string) {
	const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
	return `"${safe.replaceAll('"', '""')}"`;
}

export function AuditPanel({
	http,
	path,
}: {
	http: FetchHttpClient;
	path: string;
}) {
	const [search, setSearch] = useState("");
	const [result, setResult] = useState("all");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [page, setPage] = useState(0);
	const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
	const mode = useWorkspaceMode();
	const query = useAuditEvents(http, path);
	const matches = adminSearch(search);
	const rows = (query.error ? [] : (query.data ?? [])).filter((row) => {
		const text = auditSummary(row);
		const localDate = adminDateKey(row.occurred_at, row.time_zone);
		return (
			(!from || localDate >= from) &&
			(!to || localDate <= to) &&
			(result === "all" || row.result === result) &&
			matches(auditSearchFields(row, text))
		);
	});
	const columns = auditColumns(mode, setSelectedEvent);
	const order = useAdminSort(rows, columns, true);
	const currentPage = Math.min(
		page,
		Math.max(0, Math.ceil(rows.length / pageSize) - 1),
	);
	const forbidden =
		query.error instanceof ApiError && query.error.status === 403;

	function exportAudit() {
		const lines = [
			[
				"Дата и время",
				"Событие",
				"Результат",
				"Пользователь",
				"Склад",
				"Заказ",
				"Источник",
				"Изменения",
			],
			...order.sorted.map((row) => [
				...Object.values(auditSummary(row)),
				row.changes
					.map(
						(change) =>
							`${changeLabel(change)}: ${changeValue(change.before)} → ${changeValue(change.after)}`,
					)
					.join("; "),
			]),
		];
		const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
		saveFile(
			new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
			mode === "sandbox"
				? "sandbox-shipment-audit.csv"
				: "gridly-shipment-audit.csv",
		);
	}

	return (
		<section className={styles.panel} aria-label="Журнал аудита">
			<div className={styles.toolbar}>
				<ListFilters
					search={{
						"aria-label": "Поиск по аудиту",
						value: search,
						onChange: (value) => {
							setSearch(value);
							setPage(0);
						},
					}}
					count={Number(result !== "all") + Number(!!from) + Number(!!to)}
					onReset={() => {
						setResult("all");
						setFrom("");
						setTo("");
						setPage(0);
					}}
				>
					<Select
						aria-label="Результат события"
						value={result}
						onValueChange={(value) => {
							setResult(value);
							setPage(0);
						}}
						options={[
							{ value: "all", label: "Все результаты" },
							{ value: "success", label: "Успех" },
							{ value: "failure", label: "Отказ" },
						]}
					/>
					<DateRangeFields
						from={from}
						to={to}
						onFromChange={(value) => {
							setFrom(value);
							setPage(0);
						}}
						onToChange={(value) => {
							setTo(value);
							setPage(0);
						}}
					/>
				</ListFilters>
				<Button variant="default" disabled={!rows.length} onClick={exportAudit}>
					Скачать аудит в CSV
				</Button>
			</div>
			{from && to && from > to && (
				<Feedback tone="error">
					Дата окончания должна быть не раньше даты начала.
				</Feedback>
			)}
			{query.isPending && <Feedback tone="loading">Загружаем журнал…</Feedback>}
			{query.error && (
				<Feedback
					tone="error"
					action={
						forbidden ? undefined : <RetryButton onRetry={query.refetch} />
					}
				>
					{forbidden
						? "У аккаунта нет доступа к журналу аудита."
						: errorMessage(query.error)}
				</Feedback>
			)}
			{query.data && !query.error && (
				<>
					<AdminTable
						label="События аудита"
						columns={columns}
						rowKey={(row) => row.id}
						rows={order.sorted.slice(
							currentPage * pageSize,
							(currentPage + 1) * pageSize,
						)}
						sort={order.sort}
						onSort={(index) => {
							order.onSort(index);
							setPage(0);
						}}
					/>
					<div className={styles.pagination}>
						<span aria-live="polite">Найдено событий: {rows.length}</span>
						{rows.length > pageSize && (
							<div className={styles.actions}>
								<Button
									size="sm"
									variant="secondary"
									disabled={currentPage === 0}
									onClick={() => setPage(currentPage - 1)}
								>
									Назад
								</Button>
								<Button
									size="sm"
									variant="secondary"
									disabled={(currentPage + 1) * pageSize >= rows.length}
									onClick={() => setPage(currentPage + 1)}
								>
									Далее
								</Button>
							</div>
						)}
					</div>
					{selectedEvent && (
						<AuditEventDialog
							event={selectedEvent}
							onClose={() => setSelectedEvent(null)}
						/>
					)}
				</>
			)}
		</section>
	);
}

function auditSearchFields(row: AuditEvent, text = auditSummary(row)) {
	return [
		...Object.values(text),
		row.id,
		row.correlation_id,
		row.event_type,
		...row.changes.flatMap((change) => [
			changeLabel(change),
			changeValue(change.before),
			changeValue(change.after),
		]),
	];
}

function auditColumns(
	mode: "standard" | "sandbox",
	openEvent: (row: AuditEvent) => void,
): AdminColumn<AuditEvent>[] {
	return [
		{
			label: "Дата и время",
			value: (row) => Date.parse(row.occurred_at),
			cell: (row) => (
				<time dateTime={row.occurred_at}>{auditSummary(row).date}</time>
			),
		},
		{
			label: "Событие",
			value: (row) => auditSummary(row).event,
			cell: (row) => (
				<button
					className={styles.auditEventButton}
					type="button"
					onClick={() => openEvent(row)}
				>
					{auditSummary(row).event}
				</button>
			),
		},
		{
			label: "Результат",
			value: (row) => auditSummary(row).result,
			cell: (row) => (
				<Badge tone={row.result === "success" ? "success" : "danger"}>
					{auditSummary(row).result}
				</Badge>
			),
		},
		{
			label: "Пользователь",
			value: (row) => auditSummary(row).actor,
			cell: (row) => (
				<>
					{row.actor_id ? (
						<Link
							to={`?${new URLSearchParams({ tab: "users", user: row.actor_id })}`}
						>
							{auditSummary(row).actor}
						</Link>
					) : (
						auditSummary(row).actor
					)}
					{row.actor_id && (
						<small className={styles.subtle}>{auditSummary(row).source}</small>
					)}
				</>
			),
		},
		{
			label: "Склад",
			value: (row) => auditSummary(row).warehouse,
			cell: (row) =>
				row.warehouse_id ? (
					<Link to={warehousePath(mode, row.warehouse_id)}>
						{auditSummary(row).warehouse}
					</Link>
				) : (
					"Нет склада"
				),
		},
		{
			label: "Заказ",
			value: (row) => auditSummary(row).order,
			cell: (row) =>
				row.warehouse_id && row.order_id ? (
					<Link
						aria-label={`Диагностика заказа ${auditSummary(row).order}`}
						to={`?${new URLSearchParams({ tab: "system", warehouse_id: row.warehouse_id, order_id: row.order_id })}`}
					>
						{auditSummary(row).order}
					</Link>
				) : (
					"Нет заказа"
				),
		},
	];
}

export function AuditEvents({
	items,
	search,
	label = "События заказа",
}: {
	items: AuditEvent[];
	search: string;
	label?: string;
}) {
	const mode = useWorkspaceMode();
	const matches = adminSearch(search);
	const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
	return (
		<>
			<SortedAdminTable
				label={label}
				columns={auditColumns(mode, setSelectedEvent)}
				rows={items.filter((row) => matches(auditSearchFields(row)))}
				rowKey={(row) => row.id}
				descending
			/>
			{selectedEvent && (
				<AuditEventDialog
					event={selectedEvent}
					onClose={() => setSelectedEvent(null)}
				/>
			)}
		</>
	);
}

function AuditEventDialog({
	event,
	onClose,
}: {
	event: AuditEvent;
	onClose: () => void;
}) {
	const summary = auditSummary(event);
	return (
		<Modal title="Карточка события" onClose={onClose} wide>
			<dl className={styles.auditEventDetails}>
				<div>
					<dt>Событие</dt>
					<dd>{summary.event}</dd>
				</div>
				<div>
					<dt>Раздел</dt>
					<dd>{auditAreaLabels[auditArea(event)]}</dd>
				</div>
				<div>
					<dt>Кто</dt>
					<dd>{summary.actor}</dd>
				</div>
				<div>
					<dt>Источник</dt>
					<dd>{summary.source}</dd>
				</div>
				<div>
					<dt>Когда</dt>
					<dd>
						<time dateTime={event.occurred_at}>{summary.date}</time>
					</dd>
				</div>
				<div>
					<dt>Результат</dt>
					<dd>{summary.result}</dd>
				</div>
				<div>
					<dt>Склад</dt>
					<dd>{summary.warehouse || "Нет склада"}</dd>
				</div>
				<div>
					<dt>Заказ</dt>
					<dd>{summary.order || "Нет заказа"}</dd>
				</div>
			</dl>
			<details className={styles.details}>
				<summary>Технические данные</summary>
				<dl className={styles.auditEventDetails}>
					<div>
						<dt>ID события</dt>
						<dd>
							<code>{event.id}</code>
						</dd>
					</div>
					<div>
						<dt>ID операции</dt>
						<dd>
							<code>{event.correlation_id}</code>
						</dd>
					</div>
					<div>
						<dt>Тип события</dt>
						<dd>
							<code>{event.event_type}</code>
						</dd>
					</div>
					{event.actor_id && (
						<div>
							<dt>ID пользователя</dt>
							<dd>
								<code>{event.actor_id}</code>
							</dd>
						</div>
					)}
					{event.warehouse_id && (
						<div>
							<dt>ID склада</dt>
							<dd>
								<code>{event.warehouse_id}</code>
							</dd>
						</div>
					)}
					{event.order_id && (
						<div>
							<dt>ID заказа</dt>
							<dd>
								<code>{event.order_id}</code>
							</dd>
						</div>
					)}
				</dl>
			</details>
			<section className={styles.auditChanges} aria-label="Изменения">
				<h3>Изменения</h3>
				{event.changes.length ? (
					<dl>
						{event.changes.map((change) => (
							<AuditChange
								key={JSON.stringify([change.field, change.label])}
								change={change}
							/>
						))}
					</dl>
				) : (
					<p>
						{event.event_type === "account.permissions.updated"
							? "Сведения о прежних и новых правах отсутствуют в записи."
							: "В записи нет изменений полей."}
					</p>
				)}
			</section>
		</Modal>
	);
}

function AuditChange({ change }: { change: AuditEvent["changes"][number] }) {
	const permissions = permissionChanges(change);
	const displayValue = (value: unknown) =>
		change.field === "published" && typeof value === "boolean"
			? value
				? "Опубликован"
				: "Не опубликован"
			: changeValue(value);
	return (
		<div>
			<dt>{changeLabel(change)}</dt>
			{permissions ? (
				<>
					{permissions.before.length > 0 && (
						<>
							<PermissionList label="Было" items={permissions.before} />
							<PermissionList label="Стало" items={permissions.after} />
						</>
					)}
					{permissions.added.length > 0 && (
						<PermissionList label="Добавлены права" items={permissions.added} />
					)}
					{permissions.removed.length > 0 && (
						<PermissionList label="Удалены права" items={permissions.removed} />
					)}
					{!permissions.added.length && !permissions.removed.length && (
						<dd>Список прав не изменился.</dd>
					)}
				</>
			) : (
				<>
					<dd>
						<span>Было:</span> {displayValue(change.before)}
					</dd>
					<dd>
						<span>Стало:</span> {displayValue(change.after)}
					</dd>
				</>
			)}
		</div>
	);
}

function PermissionList({ label, items }: { label: string; items: string[] }) {
	return (
		<dd>
			<span>{label}:</span>
			{items.length ? (
				<ul className={styles.auditPermissionList}>
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : (
				" Нет прав"
			)}
		</dd>
	);
}
