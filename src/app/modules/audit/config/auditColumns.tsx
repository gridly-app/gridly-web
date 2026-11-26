import type { WorkspaceMode } from "@/ports/session";

import { Badge } from "@/shared/ui/dataDisplay";
import type { TableColumns } from "@/shared/ui/management";

import type { AuditRow } from "../model/auditPresentation";

import { AuditEventButton } from "../ui/list/AuditEventButton/AuditEventButton";
import { auditContextColumns } from "./auditContextColumns";

export function auditColumns(
	mode: WorkspaceMode,
	onOpenEvent: (eventId: string) => void,
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
			cell: ({ event, summary }) => (
				<AuditEventButton eventId={event.id} onOpenEvent={onOpenEvent}>
					{summary.event}
				</AuditEventButton>
			),
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
		...auditContextColumns(mode),
	];
}
