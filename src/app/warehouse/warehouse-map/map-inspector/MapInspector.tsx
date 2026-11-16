import { IconHandStop } from "@tabler/icons-react";
import { Button } from "@/shared/ui/controls";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	ErrorNotice,
} from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";
import type { MapInspection } from "./MapInspection";
import styles from "./MapInspector.module.css";
import type { MapLegendModel } from "./MapLegend";
import { MapLegend } from "./MapLegend";
import { RobotDetails } from "./RobotDetails";
import { SelectedCellDetails } from "./SelectedCellDetails";
import ZonePanel from "./zones/ZonePanel";

export interface MapInspectorProps {
	legend: MapLegendModel;
	model: MapInspection;
	cellErrors?: string[] | undefined;
	className?: string | undefined;
}

export function MapInspector({
	legend,
	model,
	className,
	cellErrors,
}: MapInspectorProps) {
	return (
		<ScrollArea
			fill
			data-slot="card"
			render={<aside />}
			className={`${className ?? ""} ${styles.details}`}
			data-empty={
				!model.selected && !model.robot && model.selectionKeys.length === 0
			}
		>
			<div className={styles.mapDetailsBody}>
				<div className={styles.sectionCaption}>
					{model.robot && !model.editing
						? "РОБОТ"
						: model.selected
							? model.inspection.zone && !model.editing
								? "СКЛАДСКАЯ ЗОНА"
								: "ВЫБРАННАЯ КЛЕТКА"
							: "ОБЗОР СКЛАДА"}
				</div>
				<ErrorNotice message={model.selectionError} />
				<ErrorNotice message={cellErrors?.join(" · ")} />
				{model.editing && model.selectionKeys.length > 0 && (
					<Button variant="ghost" onClick={model.clearSelection}>
						Снять выделение
					</Button>
				)}
				<MapSelectionDetails model={model} />
				<MapLegend model={legend} />
			</div>
		</ScrollArea>
	);
}

function MapSelectionDetails({ model }: { model: MapInspection }) {
	if (model.robot && !model.editing) {
		return <RobotDetails robot={model.robot} warehouse={model.warehouse} />;
	}
	if (model.canAssignZone && model.editing) {
		return (
			<ZonePanel
				disabled={model.busy}
				key={model.zonePanelKey}
				w={model.warehouse}
				cells={model.cells}
				keys={model.zoneKeys}
				editing={model.constructing}
				command={model.command}
				onDraft={model.onDraft}
				onCategory={model.onCategory}
			/>
		);
	}
	return model.selected ? (
		<SelectedCellDetails model={model} />
	) : (
		<MapOverview editing={model.editing} />
	);
}

type MapOverviewProps = { editing: boolean };
function MapOverview({ editing }: MapOverviewProps) {
	return (
		<Empty>
			<EmptyMedia variant="icon">
				<IconHandStop aria-hidden="true" />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle>
					{editing ? "Выберите клетки" : "Выберите клетку"}
				</EmptyTitle>
				<EmptyDescription>
					{editing
						? "Нажимайте на клетки или выделяйте область. Повторный клик снимает выделение."
						: "Нажмите на клетку, чтобы посмотреть информацию. Складская зона показывается целиком."}
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
