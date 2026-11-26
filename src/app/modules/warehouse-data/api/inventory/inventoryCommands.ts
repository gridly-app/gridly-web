import type { WarehouseCommand } from "@/domain/warehouse";
import { UserError } from "@/shared/lib";
import type { RestCommandContext } from "../commands/context";
import { writeOffLimit } from "@/domain/warehouse";

export async function writeOffStock(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "writeoff" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const stock = warehouse.stock.find((stock) => stock.id === command.value.id);

	if (!stock) {
		throw new UserError("Остаток не найден.");
	}
	if (!stock.canWriteOff || command.value.quantity > writeOffLimit(stock)) {
		throw new UserError("Количество превышает доступный для списания остаток.");
	}
	await send("/inventory/write-offs", {
		stock_id: stock.id,
		revision: command.value.revision ?? stock.revision,
		quantity: command.value.quantity,
		reason: command.value.reason,
	});
}
