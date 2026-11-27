import type { Category, CategoryInput } from "@/domain/warehouse";
import { Input } from "@/shared/ui/controls";
import { Field, FormShell } from "@/shared/ui/forms";

import { catalogNameMaxLength } from "../../model/catalog";
import { categoryFromForm } from "../../model/categoryFromForm";

export function CategoryForm({
	category,
	isPending,
	onSave,
}: {
	category?: Category | undefined;
	isPending: boolean;
	onSave: (category: CategoryInput) => Promise<void>;
}) {
	function handleSubmit(data: FormData) {
		return onSave(categoryFromForm(data, category));
	}

	return (
		<FormShell pending={isPending} onSubmit={handleSubmit}>
			<Field label="Название *">
				<Input
					name="name"
					defaultValue={category?.name}
					required
					maxLength={catalogNameMaxLength}
				/>
			</Field>
		</FormShell>
	);
}
