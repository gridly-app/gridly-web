import type { Cell } from "../warehouse/schemas";

export const cellKey = (cell: Pick<Cell, "x" | "y">) => `${cell.x},${cell.y}`;

export function toggleZoneCell(
	cells: Cell[],
	keys: string[],
	key: string,
): string[] {
	if (keys.includes(key)) {
		return keys.filter((k) => k !== key);
	}
	const next = cells.find((cell) => cellKey(cell) === key);

	if (!next) {
		throw new Error("Клетка не найдена");
	}
	return [...keys, key];
}
