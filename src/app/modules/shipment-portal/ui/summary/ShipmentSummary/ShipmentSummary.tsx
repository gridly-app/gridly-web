import { useId } from "react";

import type { Shipment } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";

import { plannedPeriod } from "../../../model/plannedPeriod";
import { orderStates } from "../../../config/shipmentLabels";
import { WarehouseReadiness } from "../WarehouseReadiness/WarehouseReadiness";

import styles from "../../../shared.module.css";

export function ShipmentSummary({
	order,
	warehouse,
	plan,
	checkedAt,
	onRefresh,
	isLoading,
}: {
	order: Shipment["order"];
	warehouse: Shipment["warehouse"] | null;
	plan: Shipment["plan"] | null;
	checkedAt: number;
	onRefresh: () => void;
	isLoading: boolean;
}) {
	const headingId = useId();
	const planPeriod = plan === null ? null : plannedPeriod(plan);
	const statusTone = order.state === "delivered" ? "success" : "neutral";

	return (
		<section className={styles.hero} aria-labelledby={headingId}>
			<div className={styles.heading}>
				<div>
					<Badge tone={statusTone}>{orderStates[order.state]}</Badge>
					<h1 id={headingId}>Заказ {order.number}</h1>
					<p>
						{order.recipient} · {order.warehouse_name}
					</p>
				</div>
				<Button variant="secondary" onClick={onRefresh} disabled={isLoading}>
					Обновить
				</Button>
			</div>
			{order.status_reason && (
				<Feedback tone="warning">{order.status_reason}</Feedback>
			)}
			<dl className={styles.facts}>
				<div>
					<dt>Дата заказа</dt>
					<dd>{formatMoment(order.created_at, order.time_zone)}</dd>
				</div>
				{planPeriod !== null && (
					<div>
						<dt>План отгрузки</dt>
						<dd>{planPeriod}</dd>
					</div>
				)}
				<div>
					<dt>Данные заказа обновлены</dt>
					<dd>{formatMoment(order.updated_at, order.time_zone)}</dd>
				</div>
				<div>
					<dt>Последняя загрузка</dt>
					<dd>{formatMoment(checkedAt, order.time_zone)}</dd>
				</div>
			</dl>
			{warehouse && <WarehouseReadiness warehouse={warehouse} />}
		</section>
	);
}
