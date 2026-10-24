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
	if (!formText(data, "reason")) {
		throw new Error("Укажите причину списания");
	}
	if (quantity > stock.quantity - stock.reserved) {
		throw new Error("Количество превышает доступный запас");
	}

	return {
		revision: stock.revision,
		id: stock.id,
		quantity,
		reason: formText(data, "reason"),
	};
}
