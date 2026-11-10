import type { WarehouseCommand } from "../../model/commands/commands";
import type { RestCommandContext } from "./context";

export async function writeOffStock(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "writeoff" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const stock = warehouse.stock.find((stock) => stock.id === command.value.id);

	if (!stock) {
		throw new Error("Остаток не найден.");
	}
	if (
		!stock.canWriteOff ||
		command.value.quantity > (stock.availableQuantity ?? 0)
	) {
		throw new Error("Количество превышает доступный для списания остаток.");
	}
	await send("/inventory/write-offs", {
		stock_id: stock.id,
		revision: command.value.revision ?? stock.revision,
		quantity: command.value.quantity,
		reason: command.value.reason,
	});
}
