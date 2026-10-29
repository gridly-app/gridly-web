import { cellLabels, storageCellTypes } from "@/entities/warehouse";

import { MiniCard } from "@/shared/ui";
import { useMapSelection } from "../../model/map/MapSelectionProvider";
import localLayout from "./Layout.module.css";
import mapStyles from "./WarehouseMap.module.css";

export function SelectedCellDetails() {
	const model = useMapSelection();
	const { selected, inspection } = model;
	const {
		cells: inspectedCells,
		capacity: inspectedCapacity,
		zone: inspectedZone,
		category: inspectedCategory,
		stock: stocked,
	} = inspection;

	if (!selected) {
		return null;
	}

	return (
		<>
			<h3>{inspectedZone?.name || cellLabels[selected.type]}</h3>
			{inspectedZone && (
				<>
					<div className={localLayout.sectionCaption}>
						СКЛАДСКАЯ ЗОНА · {inspectedCells.length} КЛ.
					</div>
					<div className={mapStyles.detailLine}>
						<span>Тип хранения</span>
						<b>{cellLabels[selected.type]}</b>
					</div>
					<div className={mapStyles.detailLine}>
						<span>Категория</span>
						<b>{inspectedCategory?.name || "Не назначена"}</b>
					</div>
				</>
			)}
			<div className={mapStyles.detailLine}>
				<span>Вместимость</span>
				<b>{inspectedCapacity ?? "—"} м³</b>
			</div>
			<div className={mapStyles.detailLine}>
				<span>Партий</span>
				<b>{inspection.batchCount ?? "—"}</b>
			</div>
			{stocked.map((s) => (
				<MiniCard key={s.id}>
					<b>{s.productName}</b>
					<p>
						{s.quantity} шт. · резерв {s.reserved ?? "—"}
					</p>
					<span className={localLayout.muted}>
						{s.expires || "Без срока годности"}
					</span>
				</MiniCard>
			))}
			{!model.editing && storageCellTypes.includes(selected.type) && (
				<div className={mapStyles.mapRoutesSummary}>
					<div className={localLayout.sectionCaption}>МАРШРУТЫ РОБОТА</div>
					<p className={mapStyles.routeInbound}>
						Разгрузка → блок:{" "}
						{model.routes.inbound.length
							? `${model.routes.inbound.length - 1} шагов`
							: "Маршрут не получен"}
					</p>
					<p className={mapStyles.routeOutbound}>
						Блок → погрузка:{" "}
						{model.routes.outbound.length
							? `${model.routes.outbound.length - 1} шагов`
							: "Маршрут не получен"}
					</p>
				</div>
			)}
		</>
	);
}
