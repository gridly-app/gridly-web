import type { CellType } from "@/entities/warehouse";
import localLayout from "./Layout.module.css";
import mapStyles from "./WarehouseMap.module.css";

export interface MapLegendProps {
	model: MapLegendModel;
}

export interface MapLegendModel {
	entries: [string, string][];
	palette: Record<CellType, string>;
}

export function MapLegend({ model }: MapLegendProps) {
	const { entries, palette } = model;

	return (
		<div className={mapStyles.legend}>
			<div
				className={`${localLayout["section-caption"]} ${mapStyles.legendCaption}`}
			>
				ОБОЗНАЧЕНИЯ
			</div>
			{entries.map(([k, label]) => (
				<div key={k}>
					<i style={{ background: palette[k as CellType] }} />
					{label}
				</div>
			))}
		</div>
	);
}
