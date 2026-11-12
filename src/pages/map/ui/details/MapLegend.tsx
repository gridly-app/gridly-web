import type { CellType } from "@/entities/warehouse";
import { Badge } from "@/shared/ui/dataDisplay";
import detailsStyles from "./MapDetails.module.css";
import styles from "./MapLegend.module.css";

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
		<div className={styles.legend}>
			<div
				className={`${detailsStyles.sectionCaption} ${styles.legendCaption}`}
			>
				ОБОЗНАЧЕНИЯ
			</div>
			{entries.map(([k, label]) => (
				<Badge key={k} tone="neutral">
					<Badge
						aria-hidden="true"
						style={{ background: palette[k as CellType] }}
						className={styles.legendSwatch}
					/>
					{label}
				</Badge>
			))}
		</div>
	);
}
