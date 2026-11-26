import { adminLocation, warehousePath } from "@/ports/navigation";
import type { WorkspaceMode } from "@/ports/session";
import {
	managementStyles as styles,
	type TableColumns,
} from "@/shared/ui/management";
import { Link } from "@/shared/ui/navigation";

import type { AuditRow } from "../model/events/auditRow";
import { AuditUserCell } from "../ui/list/AuditUserCell/AuditUserCell";

export function auditContextColumns(
	mode: WorkspaceMode,
): TableColumns<AuditRow> {
	return [
		{
			id: "user",
			label: "Пользователь",
			value: ({ summary }) => summary.actor,
			cell: (row) => <AuditUserCell {...row} />,
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
