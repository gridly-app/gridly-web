import { Input } from "@/shared/ui/controls";
import { Combobox, Field } from "@/shared/ui/forms";
import type { useZonePanel } from "../../model/zones/useZonePanel";
import mapStyles from "./ZonePanel.module.css";

export interface ZoneFieldsProps {
	model: Pick<
		ReturnType<typeof useZonePanel>,
		"name" | "changeName" | "category" | "changeCategory" | "visibleCategories"
	>;
}

export function ZoneFields({ model }: ZoneFieldsProps) {
	const { name, changeName, category, changeCategory, visibleCategories } =
		model;

	return (
		<>
			<Field
				className={mapStyles.zoneField}
				label="Название зоны *"
				accessibleLabel="Название зоны"
			>
				<Input
					className={mapStyles.zoneInput}
					aria-label="Название зоны"
					required
					maxLength={80}
					value={name}
					onChange={changeName}
				/>
			</Field>
			<Field
				className={mapStyles.zoneField}
				label="Категория *"
				accessibleLabel="Категория зоны"
			>
				<Combobox
					className={mapStyles.zoneInput}
					aria-label="Категория зоны"
					required
					value={category}
					onValueChange={changeCategory}
					placeholder="Выберите категорию"
					options={visibleCategories.map((c) => ({
						value: c.id,
						label: c.name,
					}))}
				/>
			</Field>
		</>
	);
}
