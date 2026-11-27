import { Checkbox, Input } from "@/shared/ui/controls";
import { Field, Label } from "@/shared/ui/forms";

import type { StorageZoneRow } from "../../model/categoryStorage";

import styles from "./StorageZoneFields.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU");

export function StorageZoneFields({
	row,
	isVisible,
	canEdit,
	isPending,
	onInvalid,
}: {
	row: StorageZoneRow;
	isVisible: boolean;
	canEdit: boolean;
	isPending: boolean;
	onInvalid: () => void;
}) {
	const {
		id,
		name,
		isAssigned,
		cellCount,
		capacity,
		quantity,
		isUniform,
		firstCapacity,
	} = row;

	return (
		<section className={styles.zone} hidden={!isVisible}>
			{canEdit ? (
				<Label>
					<Checkbox
						name="zone"
						value={id}
						defaultChecked={isAssigned}
						disabled={isPending}
					/>
					{name}
				</Label>
			) : (
				<strong>{name}</strong>
			)}
			<p>
				{cellCount} кл. · вместимость {numberFormat.format(capacity)} м³ · на
				хранении {numberFormat.format(quantity)} шт.
			</p>
			{canEdit && (
				<Field label={`Лимит на клетку, м³ · ${name}`}>
					<Input
						type="number"
						min={0}
						step="any"
						name={`capacity:${id}`}
						defaultValue={isUniform ? firstCapacity : undefined}
						placeholder={isUniform ? undefined : "Разные лимиты в клетках"}
						disabled={isPending}
						onInvalid={onInvalid}
					/>
				</Field>
			)}
		</section>
	);
}
