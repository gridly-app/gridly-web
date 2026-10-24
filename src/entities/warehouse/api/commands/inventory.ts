import type { WarehouseCommand } from "../../model/commands/commands";
import type { RestCommandContext } from "./context";

export async function writeOffStock(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "writeoff" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const stock = warehouse.stock.find((stock) => stock.id === command.value.id);

	if (!stock || stock.cell.startsWith("robot:")) {
		throw new Error("Выберите остаток в складской клетке.");
	}
	await send("/inventory/write-offs", {
		batch_id: stock.batchId,
		cell_x: Number(stock.cell.split(",")[0]),
		cell_y: Number(stock.cell.split(",")[1]),
		quantity: command.value.quantity,
		reason: command.value.reason,
	});
}
