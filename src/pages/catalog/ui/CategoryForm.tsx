import type { Category } from "@/entities/warehouse";
import { Combobox, Field, FormShell, Input } from "@/shared/ui";
import { categoryFromForm } from "../model/categoryFromForm";

export interface CategoryFormProps {
	category?: Category;
	onSave: (category: Category) => Promise<void>;
	pending: boolean;
}

export function CategoryForm({ category, pending, onSave }: CategoryFormProps) {
	return (
		<FormShell
			pending={pending}
			onSubmit={(data) => onSave(categoryFromForm(data, category))}
		>
			<Field label="Название *">
				<Input
					name="name"
					defaultValue={category?.name}
					required
					maxLength={80}
				/>
			</Field>
			<Field label="Тип хранения">
				<Combobox
					name="cold"
					defaultValue={String(category?.cold || false)}
					options={[
						{ value: "false", label: "Обычное" },
						{ value: "true", label: "Холодное" },
					]}
				/>
			</Field>
		</FormShell>
	);
}
