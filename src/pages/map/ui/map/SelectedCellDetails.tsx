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
					<div className={localLayout["section-caption"]}>
						СКЛАДСКАЯ ЗОНА · {inspectedCells.length} КЛ.
					</div>
					<div className={mapStyles["detail-line"]}>
						<span>Тип хранения</span>
						<b>{cellLabels[selected.type]}</b>
					</div>
					<div className={mapStyles["detail-line"]}>
						<span>Категория</span>
						<b>{inspectedCategory?.name || "Не назначена"}</b>
					</div>
				</>
			)}
			<div className={mapStyles["detail-line"]}>
				<span>Вместимость</span>
				<b>{inspectedCapacity} м³</b>
			</div>
			<div className={mapStyles["detail-line"]}>
				<span>Партий</span>
				<b>{stocked.length}</b>
			</div>
			{stocked.map((s) => (
				<MiniCard key={s.id}>
					<b>{s.productName}</b>
					<p>
						{s.quantity} шт. · резерв {s.reserved}
					</p>
					<span className={localLayout.muted}>
						{s.expires || "Без срока годности"}
					</span>
				</MiniCard>
			))}
			{!model.editing && storageCellTypes.includes(selected.type) && (
				<div className={mapStyles["map-routes-summary"]}>
					<div className={localLayout["section-caption"]}>МАРШРУТЫ РОБОТА</div>
					<p className={mapStyles["route-inbound"]}>
						Разгрузка → блок:{" "}
						{model.routes.inbound.length
							? `${model.routes.inbound.length - 1} шагов`
							: "Нет пути"}
					</p>
					<p className={mapStyles["route-outbound"]}>
						Блок → погрузка:{" "}
						{model.routes.outbound.length
							? `${model.routes.outbound.length - 1} шагов`
							: "Нет пути"}
					</p>
				</div>
			)}
		</>
	);
}
