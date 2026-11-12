import { Button, StableLabel } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Fieldset, Form } from "@/shared/ui/forms";
import type { ZonePanelOptions } from "../../model/zones/useZonePanel";
import { useZonePanel } from "../../model/zones/useZonePanel";
import { ZoneCategoryForm } from "./ZoneCategoryForm";
import { ZoneFields } from "./ZoneFields";
import mapStyles from "./ZonePanel.module.css";

export type ZonePanelProps = ZonePanelOptions & {
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
			<ZoneSummary model={model} />
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

interface ZoneSummaryProps {
	model: Pick<ReturnType<typeof useZonePanel>, "picked" | "first" | "capacity">;
}

function ZoneSummary({ model }: ZoneSummaryProps) {
	const { picked, first, capacity } = model;
	if (!first) return null;

	return (
		<>
			<div className={mapStyles.sectionCaption}>
				СКЛАДСКАЯ ЗОНА · {picked.length} КЛ.
			</div>
			<div className={mapStyles.capacity}>
				<span>Вместимость</span>
				<b>{capacity ?? "—"} м³</b>
			</div>
		</>
	);
}
