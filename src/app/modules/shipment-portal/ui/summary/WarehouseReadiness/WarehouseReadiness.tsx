import { formatUnit, priorities, type Shipment } from "@/domain/shipment";

import styles from "../../../shared.module.css";

export function WarehouseReadiness({
	warehouse,
}: {
	warehouse: Shipment["warehouse"];
}) {
	const priorityLabel = warehouse.priority
		? priorities[warehouse.priority]
		: "Не указан";

	return (
		<>
			<h2>Готовность на складе</h2>
			<p>Приоритет · {priorityLabel}</p>
			{warehouse.quantities.length ? (
				<section
					className={styles.scroll}
					aria-label="Готовность на складе"
					tabIndex={0}
				>
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
				</section>
			) : (
				<p>Данные о готовности ещё не внесены.</p>
			)}
		</>
	);
}
