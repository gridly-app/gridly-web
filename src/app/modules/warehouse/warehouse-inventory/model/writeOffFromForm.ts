import {
	type CommandPayloads,
	type Stock,
	writeOffLimit,
} from "@/domain/warehouse";
import { formNumber, formText, UserError } from "@/shared/lib";

export const writeOffReasonMaxLength = 500;

export function writeOffFromForm(
	data: FormData,
	stock: Stock,
): CommandPayloads["writeoff"] {
	const quantity = formNumber(data, "quantity");
	const reason = formText(data, "reason");

	if (!Number.isInteger(quantity) || quantity < 1)
		throw new UserError("Укажите целое положительное количество");
	if (quantity > writeOffLimit(stock))
		throw new UserError("Количество превышает доступный остаток");
	if (!reason) throw new UserError("Укажите причину списания");

	return { revision: stock.revision, id: stock.id, quantity, reason };
}
