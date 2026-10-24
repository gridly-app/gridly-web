import { useMapSelection } from "../../model/map/MapSelectionProvider";
import ZonePanel from "../zones/ZonePanel";
import { MapOverview } from "./MapOverview";
import { RobotDetails } from "./RobotDetails";
import { SelectedCellDetails } from "./SelectedCellDetails";

export function MapSelectionDetails() {
	const model = useMapSelection();
	const {
		canAssignZone,
		zonePanelKey,
		warehouse,
		cells,
		zoneKeys,
		editing,
		command,
		constructing,
		onDraft,
		selected,
	} = model;

	return (
		<>
			{model.robot && !editing ? (
				<RobotDetails robot={model.robot} warehouse={warehouse} />
			) : canAssignZone ? (
				<>
					{!editing && <SelectedCellDetails />}
					<ZonePanel
						showSummary={editing}
						key={zonePanelKey}
						w={warehouse}
						cells={cells}
						keys={zoneKeys}
						editing={constructing}
						command={command}
						onDraft={onDraft}
					/>
				</>
			) : selected ? (
				<SelectedCellDetails />
			) : (
				<MapOverview editing={editing} />
			)}
		</>
	);
}
