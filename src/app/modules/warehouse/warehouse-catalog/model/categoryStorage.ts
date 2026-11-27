import {
	type Category,
	type Cell,
	cellKey,
	storageCellTypes,
	type WarehouseView,
} from "@/domain/warehouse";

function isStorageCell(cell: Cell) {
	return Boolean(cell.zone) && storageCellTypes.includes(cell.type);
}

function sumBy<T>(items: T[], value: (item: T) => number) {
	return items.reduce((total, item) => total + value(item), 0);
}

export function categoryStorageZones(categoryId: string, cells: Cell[]) {
	const zones = new Map<string, Cell[]>();

	for (const cell of cells) {
		if (!cell.zone || !isStorageCell(cell)) continue;
		if (cell.zone.categoryId && cell.zone.categoryId !== categoryId) continue;

		const zoneCells = zones.get(cell.zone.id) ?? [];

		zoneCells.push(cell);
		zones.set(cell.zone.id, zoneCells);
	}

	return zones;
}

export function categoryStorageRows(
	zones: Map<string, Cell[]>,
	stock: WarehouseView<"inventory">["stock"],
	categoryId: string,
	canEdit: boolean,
) {
	const stockByCell = new Map<string, number>();

	for (const item of stock) {
		stockByCell.set(
			item.cell,
			(stockByCell.get(item.cell) ?? 0) + item.quantity,
		);
	}

	return [...zones].flatMap(([id, cells]) => {
		const zone = cells[0]?.zone;

		if (!zone) return [];

		const isAssigned = zone.categoryId === categoryId;

		if (!canEdit && !isAssigned) return [];

		const firstCapacity = cells[0]?.capacity;

		return [
			{
				id,
				name: zone.name,
				isAssigned,
				cellCount: cells.length,
				capacity: sumBy(cells, (cell) => cell.capacity ?? 0),
				quantity: sumBy(cells, (cell) => stockByCell.get(cellKey(cell)) ?? 0),
				isUniform: cells.every((cell) => cell.capacity === firstCapacity),
				firstCapacity,
			},
		];
	});
}

export type StorageZoneRow = ReturnType<typeof categoryStorageRows>[number];

type StorageAssignment = {
	data: FormData;
	selectedZones: Set<FormDataEntryValue>;
	zones: Map<string, Cell[]>;
	category: Category;
};

function assignedCell(
	cell: Cell,
	{ data, selectedZones, zones, category }: StorageAssignment,
): Cell {
	const { zone } = cell;

	if (!zone || !zones.has(zone.id) || !isStorageCell(cell)) return cell;

	const isAssigned = selectedZones.has(zone.id);
	const limit = data.get(`capacity:${zone.id}`);
	const hasLimit = typeof limit === "string" && limit !== "";
	const assignedType = category.cold ? "cold" : "storage";

	return {
		...cell,
		type: isAssigned ? assignedType : cell.type,
		zone: { ...zone, categoryId: isAssigned ? category.id : "" },
		capacity: isAssigned && hasLimit ? Number(limit) : cell.capacity,
	};
}

function isSameStorage(cell: Cell, original: Cell | undefined) {
	return (
		cell.type === original?.type &&
		cell.capacity === original?.capacity &&
		cell.zone?.categoryId === original?.zone?.categoryId
	);
}

export function assignedStorageCells(
	data: FormData,
	original: Cell[],
	zones: Map<string, Cell[]>,
	category: Category,
) {
	const assignment = {
		data,
		selectedZones: new Set(data.getAll("zone")),
		zones,
		category,
	};
	const cells = original.map((cell) => assignedCell(cell, assignment));
	const isUnchanged = cells.every((cell, index) =>
		isSameStorage(cell, original[index]),
	);

	return isUnchanged ? undefined : cells;
}
