import type { WarehouseInput } from "@/domain/warehouse";
import { formNumber, formText, UserError } from "@/shared/lib";

export const warehouseFormLimits = {
	minSize: 2,
	maxSize: 100,
	maxNameLength: 80,
};

export function warehouseFromForm(data: FormData): WarehouseInput {
	const { minSize, maxSize, maxNameLength } = warehouseFormLimits;
	const name = formText(data, "name");
	const width = formNumber(data, "width");
	const height = formNumber(data, "height");

	if (name.length < 1 || name.length > maxNameLength) {
		throw new UserError(
			`Введите название склада от 1 до ${maxNameLength} символов`,
		);
	}
	if (
		![width, height].every(
			(size) => Number.isInteger(size) && size >= minSize && size <= maxSize,
		)
	) {
		throw new UserError(
			`Размеры должны быть целыми числами от ${minSize} до ${maxSize}`,
		);
	}

	return { name, width, height, timezone: "Europe/Moscow" };
}
