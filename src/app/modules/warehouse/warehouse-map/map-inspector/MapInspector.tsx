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

import type { MapInspection } from "./model/MapInspection";
import { MapLegend, type MapLegendModel } from "./ui/MapLegend/MapLegend";
import { RobotDetails } from "./ui/RobotDetails/RobotDetails";
import { SelectedCellDetails } from "./ui/SelectedCellDetails/SelectedCellDetails";
import { ZonePanel } from "./ui/ZonePanel/ZonePanel";

import styles from "./shared.module.css";

export interface MapInspectorProps {
	legend: MapLegendModel;
	model: MapInspection;
	cellErrors?: string[] | undefined;
	className?: string | undefined;
}

function detailsCaption(model: MapInspection) {
	if (model.robot && !model.editing) return "РОБОТ";
	if (!model.selected) return "ОБЗОР СКЛАДА";
	if (model.inspection.zone && !model.editing) return "СКЛАДСКАЯ ЗОНА";

	return "ВЫБРАННАЯ КЛЕТКА";
}

export function MapInspector({
	legend,
	model,
	className,
	cellErrors,
}: MapInspectorProps) {
	const isEmpty =
		!model.selected && !model.robot && model.selectionKeys.length === 0;
	const canClearSelection = model.editing && model.selectionKeys.length > 0;

	return (
		<ScrollArea
			fill
			data-slot="card"
			render={<aside />}
			className={`${className ?? ""} ${styles.details}`}
			data-empty={isEmpty}
		>
			<div className={styles.mapDetailsBody}>
				<div className={styles.detailsSectionCaption}>
					{detailsCaption(model)}
				</div>
				<ErrorNotice message={model.selectionError} />
				<ErrorNotice message={cellErrors?.join(" · ")} />
				{canClearSelection && (
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
	if (model.robot && !model.editing)
		return <RobotDetails robot={model.robot} warehouse={model.warehouse} />;

	if (model.canAssignZone && model.editing) {
		return (
			<ZonePanel
				disabled={model.busy}
				key={model.zonePanelKey}
				warehouse={model.warehouse}
				cells={model.cells}
				keys={model.zoneKeys}
				onDraft={model.onDraft}
				onCategory={model.onCategory}
			/>
		);
	}

	if (model.selected) return <SelectedCellDetails model={model} />;

	return <MapOverview editing={model.editing} />;
}

function MapOverview({ editing }: { editing: boolean }) {
	const title = editing ? "Выберите клетки" : "Выберите клетку";
	const description = editing
		? "Нажимайте на клетки или выделяйте область. Повторный клик снимает выделение."
		: "Нажмите на клетку, чтобы посмотреть информацию. Складская зона показывается целиком.";

	return (
		<Empty>
			<EmptyMedia variant="icon">
				<IconHandStop aria-hidden="true" />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
