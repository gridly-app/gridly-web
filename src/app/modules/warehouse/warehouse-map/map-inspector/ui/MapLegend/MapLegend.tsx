import type { CellType } from "@/domain/warehouse";
import { Badge } from "@/shared/ui/dataDisplay";

import detailsStyles from "../../shared.module.css";
import styles from "./MapLegend.module.css";

export interface MapLegendModel {
	entries: [CellType, string][];
	palette: Record<CellType, string>;
}

export function MapLegend({ model }: { model: MapLegendModel }) {
	const { entries, palette } = model;

	return (
		<div className={styles.legend}>
			<div
				className={`${detailsStyles.detailsSectionCaption} ${styles.legendCaption}`}
			>
				ОБОЗНАЧЕНИЯ
			</div>
			{entries.map(([type, label]) => (
				<Badge key={type} tone="neutral">
					<Badge
						aria-hidden="true"
						style={{ background: palette[type] }}
						className={styles.legendSwatch}
					/>
					{label}
				</Badge>
			))}
		</div>
	);
}
