import { type Cell, type Stock, storageCellTypes } from "../warehouse/schemas";
import { cellKey } from "./zones";

export function stockZoneId(cell: Cell) {
	return cell.zone ? `zone:${cell.zone.id}` : `type:${cell.type}`;
}

export function stockZoneName(cell: Cell) {
	return cell.zone?.name || "Зона хранения";
}

export function stockZoneCells(cells: readonly Cell[]) {
	return new Map(
		cells
			.filter((cell) => storageCellTypes.includes(cell.type))
			.map((cell) => [cellKey(cell), cell]),
	);
}

export function stockZoneNames(cells: readonly Cell[]) {
	const zones = stockZoneCells(cells);
	return (stock: Pick<Stock, "cell">) => {
		const cell = zones.get(stock.cell);
		return cell
			? stockZoneName(cell)
			: stock.cell.startsWith("robot:")
				? "На роботе"
				: "Зона не указана";
	};
}
