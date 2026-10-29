import { IconHandStop } from "@tabler/icons-react";
import localLayout from "./Layout.module.css";
import mapStyles from "./WarehouseMap.module.css";

export type MapOverviewProps = { editing: boolean };

export function MapOverview({ editing }: MapOverviewProps) {
	return (
		<>
			<div className={mapStyles.overviewIcon}>
				<IconHandStop size={30} />
			</div>
			<h3>{editing ? "Выберите клетки" : "Выберите клетку"}</h3>
			<p className={localLayout.muted}>
				{editing
					? "Нажимайте на клетки или выделяйте область. Повторный клик снимает выделение."
					: "Нажмите на клетку, чтобы посмотреть информацию. Складская зона показывается целиком."}
			</p>
		</>
	);
}
