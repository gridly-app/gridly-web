import { Button, ErrorNotice, Fieldset, Form, StableLabel } from "@/shared/ui";
import type { ZonePanelOptions } from "../../model/zones/useZonePanel";
import { useZonePanel } from "../../model/zones/useZonePanel";
import mapStyles from "../map/WarehouseMap.module.css";
import { ZoneCategoryForm } from "./ZoneCategoryForm";
import { ZoneFields } from "./ZoneFields";
import { ZoneSummary } from "./ZoneSummary";

export type ZonePanelProps = ZonePanelOptions & {
	showSummary?: boolean | undefined;
	disabled?: boolean | undefined;
};

export default function ZonePanel(props: ZonePanelProps) {
	const model = useZonePanel(props);

	return (
		<Form
			className={mapStyles.zoneForm}
			onSubmit={(event) => {
				void model.save(event);
			}}
		>
			{props.showSummary !== false && <ZoneSummary model={model} />}
			<Fieldset
				className={mapStyles.zoneFields}
				disabled={props.disabled || model.pending}
			>
				<ZoneFields model={model} />
				<ZoneCategoryForm model={model} />
				<ErrorNotice message={model.error} />
				<Button
					className={`${mapStyles.zoneButton} ${mapStyles.zoneSubmit}`}
					variant="default"
					type="submit"
					fullWidth
					disabled={props.disabled || model.pending}
				>
					<StableLabel variants={["Сохраняем…", "Применить к черновику"]}>
						{model.pending ? "Сохраняем…" : "Применить к черновику"}
					</StableLabel>
				</Button>
			</Fieldset>
		</Form>
	);
}
