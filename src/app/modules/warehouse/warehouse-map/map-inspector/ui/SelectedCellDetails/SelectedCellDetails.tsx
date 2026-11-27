import {
	cellLabels,
	type GridPosition,
	storageCellTypes,
} from "@/domain/warehouse";
import { Card } from "@/shared/ui/dataDisplay";

import type { MapInspection } from "../../model/MapInspection";

import styles from "../../shared.module.css";

function routeSteps(route: readonly GridPosition[]) {
	return route.length ? `${route.length - 1} шагов` : "Маршрут не получен";
}

export function SelectedCellDetails({ model }: { model: MapInspection }) {
	const { selected, inspection, routes } = model;

	if (!selected) return null;

	const { cells, capacity, zone, category, stock, batchCount } = inspection;
	const hasRoutes = !model.editing && storageCellTypes.includes(selected.type);

	return (
		<>
			<h3>{zone?.name || cellLabels[selected.type]}</h3>
			{zone && (
				<>
					<div className={styles.detailsSectionCaption}>
						СКЛАДСКАЯ ЗОНА · {cells.length} КЛ.
					</div>
					<div className={styles.detailLine}>
						<span>Тип хранения</span>
						<b>{cellLabels[selected.type]}</b>
					</div>
					<div className={styles.detailLine}>
						<span>Категория</span>
						<b>{category?.name || "Не назначена"}</b>
					</div>
				</>
			)}
			<div className={styles.detailLine}>
				<span>Вместимость</span>
				<b>{capacity ?? "—"} м³</b>
			</div>
			<div className={styles.detailLine}>
				<span>Партий</span>
				<b>{batchCount ?? "—"}</b>
			</div>
			{stock.map((item) => (
				<Card key={item.id}>
					<b>{item.productName}</b>
					<p>
						{item.quantity} шт. · резерв {item.reserved ?? "—"}
					</p>
					<span className={styles.muted}>
						{item.expires || "Без срока годности"}
					</span>
				</Card>
			))}
			{hasRoutes && (
				<div className={styles.mapRoutesSummary}>
					<div className={styles.detailsSectionCaption}>МАРШРУТЫ РОБОТА</div>
					<p className={styles.routeInbound}>
						Разгрузка → блок: {routeSteps(routes.inbound)}
					</p>
					<p className={styles.routeOutbound}>
						Блок → погрузка: {routeSteps(routes.outbound)}
					</p>
				</div>
			)}
		</>
	);
}
