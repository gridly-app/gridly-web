import type { Category, CategoryInput } from "@/entities/warehouse";
import { Input } from "@/shared/ui/controls";
import { Field, FormShell } from "@/shared/ui/forms";
import { categoryFromForm } from "../../model/categoryFromForm";

export interface CategoryFormProps {
	category?: Category | undefined;
	onSave: (category: CategoryInput) => Promise<void>;
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
		</FormShell>
	);
}
