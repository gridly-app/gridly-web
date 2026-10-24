import type { CommandHandlers } from "./commandHandlers";

export const inventoryHandlers: Pick<CommandHandlers, "writeoff"> = {
	writeoff(warehouse, { id, quantity, reason }) {
		const stock = warehouse.stock.find((s) => s.id === id);

		if (!stock) {
			throw new Error("Партия не найдена");
		}
		if (!reason.trim()) {
			throw new Error("Укажите причину");
		}
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw new Error("Количество должно быть положительным целым числом");
		}
		if (quantity > stock.quantity - stock.reserved) {
			throw new Error("Нельзя списать зарезервированный запас");
		}
		stock.quantity -= quantity;
		warehouse.stock = warehouse.stock.filter((s) => s.quantity > 0);
	},
};
