import { useMemo, useState } from "react";

import { warehousePath, adminLocation } from "@/ports/navigation";
import { useWorkspaceMode, type WorkspaceMode } from "@/ports/session";

import { textSearch } from "@/shared/lib";
import {
	type AuditRow,
	auditRow,
	auditSearchFields,
} from "../../model/auditPresentation";
import type { AuditEvent } from "@/domain/shipment";

import { Badge } from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";

import {
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";
import { AuditEventDialog } from "../AuditEventDialog/AuditEventDialog";

import auditEventsStyles from "./AuditEvents.module.css";

function auditUserSelection(
	user: string,
	source: string,
): { user: string; user_kind?: "account" | "guest" } {
	if (source === "account" || source === "guest")
		return { user, user_kind: source };

	return { user };
}

export function auditColumns(
	mode: WorkspaceMode,
	openEvent: (row: AuditEvent) => void,
): TableColumns<AuditRow> {
	return [
		{
			id: "date",
			label: "Дата и время",
			value: ({ timestamp }) => timestamp,
			cell: ({ event, summary }) => (
				<time dateTime={event.occurred_at}>{summary.date}</time>
			),
		},
		{
			id: "event",
			label: "Событие",
			value: ({ summary }) => summary.event,
			cell: ({ event, summary }) => {
				function handleOpenEvent() {
					openEvent(event);
				}

				return (
					<button
						className={auditEventsStyles.auditEventButton}
						type="button"
						onClick={handleOpenEvent}
					>
						{summary.event}
					</button>
				);
			},
		},
		{
			id: "result",
			label: "Результат",
			value: ({ summary }) => summary.result,
			cell: ({ event, summary }) => (
				<Badge tone={event.result === "success" ? "success" : "danger"}>
					{summary.result}
				</Badge>
			),
		},
		{
			id: "user",
			label: "Пользователь",
			value: ({ summary }) => summary.actor,
			cell: ({ event, summary }) => (
				<>
					{event.actor_id ? (
						<Link
							className={styles.link}
							to={adminLocation(
								"users",
								auditUserSelection(event.actor_id, event.source),
							)}
						>
							{summary.actor}
						</Link>
					) : (
						summary.actor
					)}
					{event.actor_id && (
						<small className={styles.subtle}>{summary.source}</small>
					)}
				</>
			),
		},
		{
			id: "warehouse",
			label: "Склад",
			value: ({ summary }) => summary.warehouse,
			cell: ({ event, summary }) =>
				event.warehouse_id ? (
					<Link
						className={styles.link}
						to={warehousePath(mode, event.warehouse_id)}
					>
						{summary.warehouse}
					</Link>
				) : (
					summary.warehouse || "Нет склада"
				),
		},
		{
			id: "order",
			label: "Заказ",
			value: ({ summary }) => summary.order,
			cell: ({ event, summary }) =>
				event.warehouse_id && event.order_id ? (
					<Link
						className={styles.link}
						aria-label={`Диагностика заказа ${summary.order}`}
						to={adminLocation("system", {
							warehouse_id: event.warehouse_id,
							order_id: event.order_id,
						})}
					>
						{summary.order}
					</Link>
				) : (
					summary.order || "Нет заказа"
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
	const matches = textSearch(search);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selectedEvent = items.find(({ id }) => id === selectedId);
	const allRows = useMemo(() => items.map(auditRow), [items]);
	const rows = search
		? allRows.filter((row) => matches(auditSearchFields(row)))
		: allRows;

	return (
		<>
			<SortedTable
				label={label}
				columns={auditColumns(mode, (event) => setSelectedId(event.id))}
				rows={rows}
				rowKey={({ event }) => event.id}
				descending
			/>
			{selectedEvent && (
				<AuditEventDialog
					event={selectedEvent}
					onClose={() => setSelectedId(null)}
				/>
			)}
		</>
	);
}
