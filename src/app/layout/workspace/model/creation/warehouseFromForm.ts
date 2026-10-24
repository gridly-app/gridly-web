import { createWarehouse, type Warehouse } from "@/entities/warehouse";
import { formNumber, formText } from "@/shared/lib";

const MAX_WAREHOUSE_CELLS = 10_000;

export function warehouseFromForm(data: FormData): Warehouse {
	const width = formNumber(data, "width");
	const height = formNumber(data, "height");

	if (width * height > MAX_WAREHOUSE_CELLS) {
		throw new Error("Максимум 10 000 клеток");
	}
	if (
		![width, height].every(
			(size) => Number.isInteger(size) && size >= 2 && size <= 100,
		)
	) {
		throw new Error("Размеры должны быть целыми числами от 2 до 100");
	}

	return createWarehouse(formText(data, "name"), width, height);
}
