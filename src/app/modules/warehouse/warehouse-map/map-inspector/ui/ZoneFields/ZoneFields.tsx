import { Input } from "@/shared/ui/controls";
import { Combobox, Field } from "@/shared/ui/forms";

import type { useZonePanel } from "../../model/zones/useZonePanel";

import styles from "../../shared.module.css";

const zoneNameMaxLength = 80;

export function ZoneFields({
	model,
}: {
	model: Pick<
		ReturnType<typeof useZonePanel>,
		"name" | "changeName" | "category" | "changeCategory" | "visibleCategories"
	>;
}) {
	const { name, changeName, category, changeCategory, visibleCategories } =
		model;
	const categoryOptions = visibleCategories.map((item) => ({
		value: item.id,
		label: item.name,
	}));

	return (
		<>
			<Field
				className={styles.zoneField}
				label="Название зоны *"
				accessibleLabel="Название зоны"
			>
				<Input
					className={styles.zoneInput}
					aria-label="Название зоны"
					required
					maxLength={zoneNameMaxLength}
					value={name}
					onChange={changeName}
				/>
			</Field>
			<Field
				className={styles.zoneField}
				label="Категория *"
				accessibleLabel="Категория зоны"
			>
				<Combobox
					className={styles.zoneInput}
					aria-label="Категория зоны"
					required
					value={category}
					onValueChange={changeCategory}
					placeholder="Выберите категорию"
					options={categoryOptions}
				/>
			</Field>
		</>
	);
}
