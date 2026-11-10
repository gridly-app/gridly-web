import type { CommandPayloads, Stock } from "@/entities/warehouse";
import { formNumber, formText } from "@/shared/lib";

export function writeOffFromForm(
	data: FormData,
	stock: Stock,
): CommandPayloads["writeoff"] {
	const quantity = formNumber(data, "quantity");

	if (!Number.isInteger(quantity) || quantity < 1) {
		throw new Error("Укажите целое положительное количество");
	}
	if (quantity > (stock.availableQuantity ?? 0))
		throw new Error("Количество превышает доступный остаток");
	if (!formText(data, "reason")) {
		throw new Error("Укажите причину списания");
	}

	return {
		revision: stock.revision,
		id: stock.id,
		quantity,
		reason: formText(data, "reason"),
	};
}
