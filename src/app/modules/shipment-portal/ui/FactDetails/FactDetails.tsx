import {
	formatMoment,
	formatUnit,
	transports,
	type Actual,
	type Shipment,
} from "@/domain/shipment";
import type { CalendarItem } from "../../model/shipmentCalendarView";

import styles from "../../shared.module.css";

export function FactDetails({
	items,
	timeZone,
	facts,
}: {
	items: CalendarItem[];
	timeZone: Shipment["order"]["time_zone"];
	facts: Actual[];
}) {
	const itemsById = new Map(items.map((item) => [item.order_line_id, item]));

	return (
		<div className={styles.scroll}>
			<table className={styles.table}>
				<thead>
					<tr>
						<th>Позиция</th>
						<th>Количество</th>
						<th>Упаковка</th>
						<th>Отгрузка / погрузка</th>
						<th>Перевозка</th>
						<th>Вагон / автомобиль</th>
						<th>Рейс / накладная</th>
						<th>Комментарий</th>
					</tr>
				</thead>
				<tbody>
					{facts.map((fact) => {
						const item = itemsById.get(fact.order_line_id);
						const itemDetails = item ? [item.sku, item.name, item.grade] : [];
						const labelParts = itemDetails.filter(Boolean);
						const itemLabel = item ? labelParts.join(" · ") : "Не указана";

						return (
							<tr key={fact.id}>
								<th scope="row">{itemLabel}</th>
								<td>
									{fact.quantity} {formatUnit(fact.unit)}
								</td>
								<td>{fact.packaging ?? "Не указана"}</td>
								<td>
									{formatMoment(fact.shipped_at, timeZone)} /{" "}
									{formatMoment(fact.loaded_at, timeZone)}
								</td>
								<td>{transports[fact.transport_type]}</td>
								<td>{fact.vehicle_number ?? "Не указан"}</td>
								<td>{fact.reference_number ?? "Не указан"}</td>
								<td>{fact.comment ?? "Не указан"}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
