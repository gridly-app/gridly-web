import { Button } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Fieldset, Form } from "@/shared/ui/forms";

import {
	type ZonePanelOptions,
	useZonePanel,
} from "../../model/zones/useZonePanel";
import { ZoneCategoryForm } from "../ZoneCategoryForm/ZoneCategoryForm";
import { ZoneFields } from "../ZoneFields/ZoneFields";

import styles from "../../shared.module.css";

export type ZonePanelProps = ZonePanelOptions & {
	disabled?: boolean | undefined;
};

export function ZonePanel(props: ZonePanelProps) {
	const model = useZonePanel(props);

	return (
		<Form className={styles.zoneForm} onSubmit={model.save}>
			<ZoneSummary model={model} />
			<Fieldset className={styles.zoneFields} disabled={props.disabled}>
				<ZoneFields model={model} />
				<ZoneCategoryForm model={model} />
				<ErrorNotice message={model.error} />
				<Button
					className={`${styles.zoneButton} ${styles.zoneSubmit}`}
					variant="default"
					type="submit"
					fullWidth
					disabled={props.disabled}
				>
					Применить к черновику
				</Button>
			</Fieldset>
		</Form>
	);
}

function ZoneSummary({
	model,
}: {
	model: Pick<ReturnType<typeof useZonePanel>, "picked" | "first" | "capacity">;
}) {
	const { picked, first, capacity } = model;

	if (!first) return null;

	return (
		<>
			<div className={styles.zoneSectionCaption}>
				СКЛАДСКАЯ ЗОНА · {picked.length} КЛ.
			</div>
			<div className={styles.capacity}>
				<span>Вместимость</span>
				<b>{capacity ?? "—"} м³</b>
			</div>
		</>
	);
}
