import {
	formatMoment,
	formatUnit,
	priorities,
	type Shipment,
} from "@/domain/shipment";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";

import styles from "../../shared.module.css";

const states = {
	active: "В исполнении",
	on_hold: "Приостановлен",
	cancelled: "Отменён",
	delivered: "Доставлен",
};

export function ShipmentSummary({
	order,
	warehouse,
	plan,
	checkedAt,
	retry,
	loading,
}: {
	order: Shipment["order"];
	warehouse: Shipment["warehouse"] | null;
	plan: Shipment["plan"] | null;
	checkedAt: number;
	retry: () => void;
	loading: boolean;
}) {
	const plannedDates = plan?.map(({ date }) => date).sort();
	return (
		<section className={styles.hero} aria-labelledby="shipment-heading">
			<div className={styles.heading}>
				<div>
					<Badge tone={order.state === "delivered" ? "success" : "neutral"}>
						{states[order.state]}
					</Badge>
					<h1 id="shipment-heading">Заказ {order.number}</h1>
					<p>
						{order.recipient} · {order.warehouse_name}
					</p>
				</div>
				<Button variant="secondary" onClick={retry} disabled={loading}>
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
				{plannedDates && (
					<div>
						<dt>План отгрузки</dt>
						<dd>
							{plannedDates.length
								? [...new Set([plannedDates[0], plannedDates.at(-1)])].join(
										" — ",
									)
								: "Не запланировано"}
						</dd>
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
					<p>
						Приоритет ·{" "}
						{warehouse.priority ? priorities[warehouse.priority] : "Не указан"}
					</p>
					{warehouse.quantities.length ? (
						<div className={styles.scroll}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Единица</th>
										<th>Готово</th>
										<th>В обработке</th>
										<th>Осталось отгрузить</th>
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
