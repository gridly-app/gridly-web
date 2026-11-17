import { formatUnit, type Shipment } from "@/domain/shipment";

import styles from "../../shared.module.css";

export function ShipmentItems({ items }: { items: Shipment["items"] }) {
	return (
		<section className={styles.panel}>
			<h2>Номенклатура</h2>
			{items.length ? (
				<div className={styles.scroll}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Код</th>
								<th>Наименование</th>
								<th>Марка / модель</th>
								<th>Количество</th>
								<th>Упаковка</th>
								<th>Исполнение</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.order_line_id}>
									<td>{item.sku}</td>
									<th scope="row">{item.name}</th>
									<td>{item.grade ?? "Не указана"}</td>
									<td>
										{item.quantity} {formatUnit(item.unit)}
									</td>
									<td>{item.packaging ?? "Не указана"}</td>
									<td>{item.variant ?? "Не указано"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p>Состав заказа ещё не внесён.</p>
			)}
		</section>
	);
}
