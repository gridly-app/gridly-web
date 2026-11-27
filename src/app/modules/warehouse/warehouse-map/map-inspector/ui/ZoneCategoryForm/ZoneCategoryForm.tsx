import { Button, Input } from "@/shared/ui/controls";
import { Card } from "@/shared/ui/dataDisplay";
import { Field } from "@/shared/ui/forms";

import type { useZonePanel } from "../../model/zones/useZonePanel";

import styles from "../../shared.module.css";

const categoryNameMaxLength = 80;

export function ZoneCategoryForm({
	model,
}: {
	model: Pick<
		ReturnType<typeof useZonePanel>,
		"toggleAdding" | "adding" | "newName" | "changeNewName" | "addCategory"
	>;
}) {
	const { toggleAdding, adding, newName, changeNewName, addCategory } = model;

	return (
		<>
			<Button
				className={`${styles.zoneButton} ${styles.zoneTextButton}`}
				variant="text"
				type="button"
				onClick={toggleAdding}
			>
				+ Добавить категорию
			</Button>
			{adding && (
				<Card>
					<Field
						className={styles.zoneField}
						label="Название категории"
						accessibleLabel="Название новой категории"
					>
						<Input
							className={styles.zoneInput}
							aria-label="Название новой категории"
							value={newName}
							onChange={changeNewName}
							maxLength={categoryNameMaxLength}
						/>
					</Field>
					<Button
						className={styles.zoneButton}
						variant="ghost"
						type="button"
						onClick={addCategory}
					>
						Создать категорию
					</Button>
				</Card>
			)}
		</>
	);
}
