import type { Category, CategoryInput } from "@/entities/warehouse";
import { formText } from "@/shared/lib";

export function categoryFromForm(
	data: FormData,
	category?: Category | undefined,
): CategoryInput {
	return {
		revision: category?.revision,
		id: category?.id,
		name: formText(data, "name"),
		cold: formText(data, "cold") === "true",
	};
}
