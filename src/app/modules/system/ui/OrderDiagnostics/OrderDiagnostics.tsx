import { shipmentManagementPath, adminLocation } from "@/ports/navigation";
import type { WorkspaceMode } from "@/ports/session";

import { formatMoment } from "@/shared/lib";
import type { SystemStatus } from "../../api/system.dto";

import { Link } from "@/shared/ui/navigation";

import type { RenderAuditEvents } from "../../model/auditContext";

import { managementStyles as styles } from "@/shared/ui/management";

import sharedStyles from "../../shared.module.css";

export function OrderDiagnostics({
	order,
	mode,
	search,
	renderAuditEvents,
}: {
	order: NonNullable<SystemStatus["order_diagnostics"]>;
	mode: WorkspaceMode;
	search: string;
	renderAuditEvents: RenderAuditEvents;
}) {
	const { warehouse_id, order_id } = order;
	const scope = { warehouse_id, order_id };
	const orderPath = adminLocation("system", { ...scope, order: order_id });
	const linkPath = adminLocation("links", scope);
	const shipmentPath =
		mode === "standard"
			? shipmentManagementPath(warehouse_id, order_id)
			: undefined;
	const title = order.order_number
		? `Заказ ${order.order_number}`
		: "Диагностика заказа";
	const location = order.warehouse_name ? `${order.warehouse_name} · ` : "";
	const updatedAt = formatMoment(order.updated_at, order.time_zone);

	return (
		<>
			<div className={styles.actions}>
				<Link className={styles.link} to={orderPath}>
					Открыть заказ
				</Link>
				{shipmentPath && (
					<Link className={styles.link} to={shipmentPath}>
						Управление отгрузкой
					</Link>
				)}
				<Link className={styles.link} to={linkPath}>
					Настроить гостевой доступ
				</Link>
			</div>
			<section className={sharedStyles.group}>
				<h2 className={sharedStyles.groupTitle}>{title}</h2>
				<p>
					{location}Снимок обновлён {updatedAt}
				</p>
				{renderAuditEvents(order.recent_events, search)}
			</section>
		</>
	);
}
