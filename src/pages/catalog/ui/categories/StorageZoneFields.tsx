import { Checkbox, Input } from "@/shared/ui/controls";
import { Field, Label } from "@/shared/ui/forms";
import type { StorageZoneRow } from "../../model/categoryStorage";
import styles from "./StorageZoneFields.module.css";

const number = new Intl.NumberFormat("ru-RU");

export function StorageZoneFields({
	row,
	visible,
	canEdit,
	pending,
	onInvalid,
}: {
	row: StorageZoneRow;
	visible: boolean;
	canEdit: boolean;
	pending: boolean;
	onInvalid: () => void;
}) {
	const {
		id,
		name,
		assigned,
		cellCount,
		capacity,
		quantity,
		uniform,
		firstCapacity,
	} = row;
	return (
		<section className={styles.zone} hidden={!visible}>
			{canEdit ? (
				<Label>
					<Checkbox
						name="zone"
						value={id}
						defaultChecked={assigned}
						disabled={pending}
					/>
					{name}
				</Label>
			) : (
				<strong>{name}</strong>
			)}
			<p>
				{cellCount} кл. · вместимость {number.format(capacity)} м³ · на хранении{" "}
				{number.format(quantity)} шт.
			</p>
			{canEdit && (
				<Field label={`Лимит на клетку, м³ · ${name}`}>
					<Input
						type="number"
						min={0}
						step="any"
						name={`capacity:${id}`}
						defaultValue={uniform ? firstCapacity : undefined}
						placeholder={uniform ? undefined : "Разные лимиты в клетках"}
						disabled={pending}
						onInvalid={onInvalid}
					/>
				</Field>
			)}
		</section>
	);
}
