import type { Category } from "@/entities/warehouse";
import { formText, id } from "@/shared/lib";

export function categoryFromForm(
	data: FormData,
	category?: Category,
): Category {
	return {
		revision: category?.revision,
		id: category?.id || id(),
		name: formText(data, "name"),
		cold: formText(data, "cold") === "true",
	};
}
