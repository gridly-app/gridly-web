import type {
	Category,
	Cell,
	Product,
	StorageZone,
	Warehouse,
} from "../warehouse/schemas";

export const cellKey = (cell: Pick<Cell, "x" | "y">) => `${cell.x},${cell.y}`;

export function assignZone(
	cells: Cell[],
	keys: string[],
	zone: StorageZone,
	categories: Category[],
): Cell[] {
	const selected = new Set(keys);
	const category = categories.find((c) => c.id === zone.categoryId);

	if (!zone.name.trim()) {
		throw new Error("Введите название зоны");
	}
	if (!category) {
		throw new Error("Выберите категорию");
	}
	const picked = cells.filter((cell) => selected.has(cellKey(cell)));

	if (!picked.length) {
		throw new Error("Выделите клетки хранения");
	}
	const type = category.cold ? "cold" : "storage";

	if (picked.some((cell) => cell.type !== type)) {
		throw new Error(
			category.cold
				? "Эта категория подходит только холодному хранению"
				: "Эта категория подходит только обычному хранению",
		);
	}
	if (new Set(picked.map((cell) => cell.zone?.categoryId || "")).size > 1) {
		throw new Error(
			"В одну зону можно объединять только клетки одной категории",
		);
	}
	if (
		cells.some(
			(cell) =>
				cell.zone &&
				cell.zone.id !== zone.id &&
				cell.zone.name.toLowerCase() === zone.name.trim().toLowerCase(),
		)
	) {
		throw new Error("Зона с таким названием уже существует");
	}

	return cells.map((cell) =>
		selected.has(cellKey(cell))
			? { ...cell, zone: { ...zone, name: zone.name.trim() } }
			: cell,
	);
}

export function toggleZoneCell(
	cells: Cell[],
	keys: string[],
	key: string,
): string[] {
	if (keys.includes(key)) {
		return keys.filter((k) => k !== key);
	}
	const next = cells.find((cell) => cellKey(cell) === key);
	const first = cells.find((cell) => cellKey(cell) === keys[0]);

	if (!next) {
		throw new Error("Клетка не найдена");
	}
	if (
		first &&
		(next.type !== first.type ||
			next.zone?.categoryId !== first.zone?.categoryId)
	) {
		throw new Error("Выбирайте клетки одной категории");
	}

	return [...keys, key];
}

export function storageCells(warehouse: Warehouse, product: Product): Cell[] {
	const type = warehouse.categories.find(
		(category) => category.id === product.category,
	)?.cold
		? "cold"
		: "storage";

	return warehouse.cells.filter(
		(cell) => cell.type === type && cell.zone?.categoryId === product.category,
	);
}

export function migrateZones(warehouse: Warehouse): Warehouse {
	const legacy = warehouse as Warehouse & {
		cellCategories?: { id: string; name: string; storageType: string }[];
	};
	const categoryMap = new Map<string, string>();

	for (const c of legacy.cellCategories || []) {
		let category = warehouse.categories.find(
			(n) =>
				n.name.toLowerCase() === c.name.toLowerCase() &&
				n.cold === (c.storageType === "cold"),
		);

		if (!category) {
			category = { id: c.id, name: c.name, cold: c.storageType === "cold" };
			warehouse.categories.push(category);
		}
		categoryMap.set(c.id, category.id);
	}
	for (const product of warehouse.products) {
		const old = product as Product & { storageCategory?: string };

		if (old.storageCategory) {
			product.category =
				categoryMap.get(old.storageCategory) || product.category;
		}
		delete old.storageCategory;
	}
	const migrate = (cells: Cell[]) =>
		cells.map((cell) => {
			if (cell.zone) {
				return {
					...cell,
					zone: {
						...cell.zone,
						categoryId:
							categoryMap.get(cell.zone.categoryId) || cell.zone.categoryId,
					},
				};
			}

			return cell;
		});

	warehouse.cells = migrate(warehouse.cells);
	if (warehouse.draft) {
		warehouse.draft = migrate(warehouse.draft);
	}
	delete legacy.cellCategories;

	return warehouse;
}
