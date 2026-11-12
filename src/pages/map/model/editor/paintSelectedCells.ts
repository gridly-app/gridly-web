import {
	type Category,
	type Cell,
	type CellType,
	cellKey,
} from "@/entities/warehouse";

export function paintCellType(
	cells: Cell[],
	keys: Set<string>,
	type: CellType,
) {
	return cells.map((cell) =>
		keys.has(cellKey(cell))
			? { ...cell, type, zone: cell.type === type ? cell.zone : undefined }
			: cell,
	);
}

export function paintCategoryZone(
	cells: Cell[],
	keys: Set<string>,
	category: Category,
) {
	const zone = {
		id: `draft-zone-${[...keys].sort()[0]}`,
		name: `${category.name} · ${[...keys][0]}`,
		categoryId: category.id,
	};
	const type = category.cold ? "cold" : "storage";
	return cells.map(
		(cell): Cell => (keys.has(cellKey(cell)) ? { ...cell, type, zone } : cell),
	);
}
