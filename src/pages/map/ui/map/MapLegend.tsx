import type { CellType } from "@/entities/warehouse";
import { Badge } from "@/shared/ui";
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
				className={`${localLayout.sectionCaption} ${mapStyles.legendCaption}`}
			>
				ОБОЗНАЧЕНИЯ
			</div>
			{entries.map(([k, label]) => (
				<Badge key={k} tone="neutral">
					<Badge
						aria-hidden="true"
						style={{ background: palette[k as CellType] }}
						className="size-3 min-w-3 p-0"
					/>
					{label}
				</Badge>
			))}
		</div>
	);
}
