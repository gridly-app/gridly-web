import type { Cell } from "../warehouse/schemas";

export function validateMap(
	cells: Cell[],
	width: number,
	height: number,
): string[] {
	const errors: string[] = [];

	for (const type of ["unload", "load", "storage", "charge", "aisle"]) {
		if (!cells.some((cell) => cell.type === type)) {
			errors.push(
				`Добавьте зону: ${{ unload: "разгрузка", load: "погрузка", storage: "хранение", charge: "зарядка", aisle: "проход" }[type]}`,
			);
		}
	}
	for (const cell of cells) {
		if (
			["unload", "load"].includes(cell.type) &&
			cell.x !== 0 &&
			cell.y !== 0 &&
			cell.x !== width - 1 &&
			cell.y !== height - 1
		) {
			errors.push(`Док (${cell.x}, ${cell.y}) должен находиться на границе`);
		}
	}
	const walk = (cell: Cell) =>
		["aisle", "unload", "load", "charge"].includes(cell.type);
	const index = new Map(cells.map((cell) => [`${cell.x},${cell.y}`, cell]));
	const start = cells.find((cell) => cell.type === "unload");
	const seen = new Set<string>();
	const queue = start ? [start] : [];

	for (let cursor = 0; cursor < queue.length; cursor++) {
		const cell = queue[cursor];
		const key = `${cell.x},${cell.y}`;

		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]) {
			const n = index.get(`${cell.x + dx},${cell.y + dy}`);

			if (n && walk(n) && !seen.has(`${n.x},${n.y}`)) {
				queue.push(n);
			}
		}
	}
	for (const cell of cells) {
		if (
			["storage", "cold"].includes(cell.type) &&
			![
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			].some(([dx, dy]) => seen.has(`${cell.x + dx},${cell.y + dy}`))
		) {
			errors.push(`Нет прохода к полке (${cell.x}, ${cell.y})`);
		}
		if (
			["load", "charge"].includes(cell.type) &&
			!seen.has(`${cell.x},${cell.y}`)
		) {
			errors.push(`Нет пути к зоне (${cell.x}, ${cell.y})`);
		}
	}

	return errors;
}
