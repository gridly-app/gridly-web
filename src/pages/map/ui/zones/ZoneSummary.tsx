import type { useZonePanel } from "../../model/zones/useZonePanel";
import mapStyles from "../map/WarehouseMap.module.css";
import localLayout from "./Layout.module.css";

export interface ZoneSummaryProps {
	model: Pick<ReturnType<typeof useZonePanel>, "picked" | "first" | "capacity">;
}

export function ZoneSummary({ model }: ZoneSummaryProps) {
	const { picked, first, capacity } = model;

	return (
		<>
			<div className={localLayout["section-caption"]}>
				СКЛАДСКАЯ ЗОНА · {picked.length} КЛ.
			</div>
			<div className={mapStyles["detail-line"]}>
				<span>Тип хранения</span>
				<b>{first.type === "cold" ? "Холодное" : "Обычное"}</b>
			</div>
			<div className={mapStyles["detail-line"]}>
				<span>Вместимость</span>
				<b>{capacity} м³</b>
			</div>
		</>
	);
}
