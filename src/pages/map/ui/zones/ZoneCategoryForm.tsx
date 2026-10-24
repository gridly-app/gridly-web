import { Button, Field, Input, MiniCard } from "@/shared/ui";
import type { useZonePanel } from "../../model/zones/useZonePanel";
import mapStyles from "../map/WarehouseMap.module.css";

export interface ZoneCategoryFormProps {
	model: Pick<
		ReturnType<typeof useZonePanel>,
		| "toggleAdding"
		| "adding"
		| "newName"
		| "changeNewName"
		| "pending"
		| "addCategory"
	>;
}

export function ZoneCategoryForm({ model }: ZoneCategoryFormProps) {
	const { toggleAdding, adding, newName, changeNewName, pending, addCategory } =
		model;

	return (
		<>
			<Button
				className={`${mapStyles.zoneButton} ${mapStyles.zoneTextButton}`}
				variant="text"
				type="button"
				onClick={toggleAdding}
			>
				+ Добавить категорию
			</Button>
			{adding && (
				<MiniCard>
					<Field
						className={mapStyles.zoneField}
						label="Название категории"
						accessibleLabel="Название новой категории"
					>
						<Input
							className={mapStyles.zoneInput}
							aria-label="Название новой категории"
							value={newName}
							onChange={changeNewName}
							maxLength={80}
						/>
					</Field>
					<Button
						className={mapStyles.zoneButton}
						variant="ghost"
						type="button"
						disabled={pending}
						onClick={() => {
							void addCategory();
						}}
					>
						Создать категорию
					</Button>
				</MiniCard>
			)}
		</>
	);
}
