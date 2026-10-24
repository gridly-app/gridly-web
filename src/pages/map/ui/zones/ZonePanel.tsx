import { Button, ErrorNotice, Form } from "@/shared/ui";
import type { ZonePanelOptions } from "../../model/zones/useZonePanel";
import { useZonePanel } from "../../model/zones/useZonePanel";
import mapStyles from "../map/WarehouseMap.module.css";
import { ZoneCategoryForm } from "./ZoneCategoryForm";
import { ZoneFields } from "./ZoneFields";
import { ZoneSummary } from "./ZoneSummary";

export type ZonePanelProps = ZonePanelOptions & { showSummary?: boolean };

export default function ZonePanel(props: ZonePanelProps) {
	const model = useZonePanel(props);

	return (
		<Form
			className={mapStyles["zone-form"]}
			onSubmit={(event) => {
				void model.save(event);
			}}
		>
			{props.showSummary !== false && <ZoneSummary model={model} />}
			<ZoneFields model={model} />
			<ZoneCategoryForm model={model} />
			<ErrorNotice message={model.error} />
			<Button
				className={`${mapStyles.zoneButton} ${mapStyles.zoneSubmit}`}
				variant="default"
				type="submit"
				fullWidth
				disabled={model.pending}
			>
				{model.pending ? "Сохраняем…" : "Сохранить зону"}
			</Button>
		</Form>
	);
}
