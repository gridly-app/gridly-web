import { Button, ErrorNotice, ScrollArea } from "@/shared/ui";
import { useMapSelection } from "../../model/map/MapSelectionProvider";
import localLayout from "./Layout.module.css";
import type { MapLegendModel } from "./MapLegend";
import { MapLegend } from "./MapLegend";
import { MapSelectionDetails } from "./MapSelectionDetails";
import mapStyles from "./WarehouseMap.module.css";

export interface MapDetailsProps {
	legend: MapLegendModel;
}

export function MapDetails({ legend }: MapDetailsProps) {
	const model = useMapSelection();
	return (
		<ScrollArea
			fill
			data-slot="card"
			render={<aside />}
			className={mapStyles.mapDetails}
			data-empty={
				!model.selected && !model.robot && model.selectionKeys.length === 0
			}
		>
			<div className={mapStyles.mapDetailsBody}>
				<div className={localLayout.sectionCaption}>
					{model.robot && !model.editing
						? "РОБОТ"
						: model.selected
							? model.inspection.zone && !model.editing
								? "СКЛАДСКАЯ ЗОНА"
								: "ВЫБРАННАЯ КЛЕТКА"
							: "ОБЗОР СКЛАДА"}
				</div>
				<ErrorNotice message={model.selectionError} />
				{model.editing && model.selectionKeys.length > 0 && (
					<Button variant="ghost" onClick={model.clearSelection}>
						Снять выделение
					</Button>
				)}
				<MapSelectionDetails />
				<MapLegend model={legend} />
			</div>
		</ScrollArea>
	);
}
