import { UserError } from "@/shared/lib";
import type { Cell } from "../warehouse";

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
		throw new UserError("Клетка не найдена");
	}
	return [...keys, key];
}
