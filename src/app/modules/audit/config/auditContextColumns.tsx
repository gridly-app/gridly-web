import { adminLocation, warehousePath } from "@/ports/navigation";
import type { WorkspaceMode } from "@/ports/session";

import { Link } from "@/shared/ui/navigation";
import {
	type TableColumns,
	managementStyles as styles,
} from "@/shared/ui/management";

import type { AuditRow } from "../model/auditPresentation";

function auditUserSelection(
	user: string,
	source: string,
): { user: string; user_kind?: "account" | "guest" } {
	if (source === "account" || source === "guest")
		return { user, user_kind: source };

	return { user };
}

export function auditContextColumns(
	mode: WorkspaceMode,
): TableColumns<AuditRow> {
	return [
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
