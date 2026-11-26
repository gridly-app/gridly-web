import { useId } from "react";
import {
	formatMoment,
	formatUnit,
	priorities,
	type Shipment,
} from "@/domain/shipment";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";

import { orderStates } from "../../../config/shipmentLabels";

import styles from "../../../shared.module.css";

export function ShipmentSummary({
	order,
	warehouse,
	plan,
	checkedAt,
	retry,
	isLoading,
}: {
	order: Shipment["order"];
	warehouse: Shipment["warehouse"] | null;
	plan: Shipment["plan"] | null;
	checkedAt: number;
	retry: () => void;
	isLoading: boolean;
}) {
	const headingId = useId();
	const planPeriod = plan === null ? null : plannedPeriod(plan);
	const statusTone = order.state === "delivered" ? "success" : "neutral";
	const priorityLabel = warehouse?.priority
		? priorities[warehouse.priority]
		: "Не указан";

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
				<Button variant="secondary" onClick={retry} disabled={isLoading}>
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
			{warehouse && (
				<>
					<h2>Готовность на складе</h2>
					<p>Приоритет · {priorityLabel}</p>
					{warehouse.quantities.length ? (
						<div className={styles.scroll}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Единица</th>
										<th>Готово</th>
										<th>В обработке</th>
										<th>Ещё не взято в подготовку</th>
									</tr>
								</thead>
								<tbody>
									{warehouse.quantities.map((row) => (
										<tr key={row.unit}>
											<th scope="row">{formatUnit(row.unit)}</th>
											<td>{row.ready_quantity}</td>
											<td>{row.processing_quantity}</td>
											<td>{row.remaining_quantity}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p>Данные о готовности ещё не внесены.</p>
					)}
				</>
			)}
		</section>
	);
}

function plannedPeriod(plan: Shipment["plan"]) {
	const dates = plan.map(({ date }) => date);

	dates.sort();

	const firstDate = dates[0];
	const lastDate = dates.at(-1);

	if (!firstDate) return "Не запланировано";
	if (firstDate === lastDate) return firstDate;

	return `${firstDate} — ${lastDate}`;
}
