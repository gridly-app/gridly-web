import {
	type Category,
	type Cell,
	cellKey,
	storageCellTypes,
	type Warehouse,
} from "@/entities/warehouse";

export function categoryStorageZones(categoryId: string, cells: Cell[]) {
	const zones = new Map<string, Cell[]>();
	for (const cell of cells) {
		if (!cell.zone || !storageCellTypes.includes(cell.type)) continue;
		if (cell.zone.categoryId && cell.zone.categoryId !== categoryId) continue;
		const zoneCells = zones.get(cell.zone.id) ?? [];
		zoneCells.push(cell);
		zones.set(cell.zone.id, zoneCells);
	}
	return zones;
}

export function categoryStorageRows(
	zones: Map<string, Cell[]>,
	stock: Warehouse["stock"],
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
		const assigned = zone.categoryId === categoryId;
		if (!canEdit && !assigned) return [];
		const firstCapacity = cells[0]?.capacity;
		const uniform = cells.every((cell) => cell.capacity === firstCapacity);
		const capacity = cells.reduce(
			(total, cell) => total + (cell.capacity ?? 0),
			0,
		);
		const quantity = cells.reduce(
			(total, cell) => total + (stockByCell.get(cellKey(cell)) ?? 0),
			0,
		);
		return [
			{
				id,
				name: zone.name,
				assigned,
				cellCount: cells.length,
				capacity,
				quantity,
				uniform,
				firstCapacity,
			},
		];
	});
}

export type StorageZoneRow = ReturnType<typeof categoryStorageRows>[number];

export function assignedStorageCells(
	data: FormData,
	original: Cell[],
	zones: Map<string, Cell[]>,
	category: Category,
) {
	const selected = new Set(data.getAll("zone"));
	const cells = original.map((cell): Cell => {
		const zone = cell.zone;
		if (!zone || !zones.has(zone.id) || !storageCellTypes.includes(cell.type))
			return cell;
		const assigned = selected.has(zone.id);
		const limit = data.get(`capacity:${zone.id}`);
		return {
			...cell,
			type: assigned ? (category.cold ? "cold" : "storage") : cell.type,
			zone: { ...zone, categoryId: assigned ? category.id : "" },
			capacity:
				assigned && typeof limit === "string" && limit !== ""
					? Number(limit)
					: cell.capacity,
		};
	});
	if (
		cells.every((cell, index) => {
			const old = original[index];
			return (
				cell.type === old?.type &&
				cell.capacity === old?.capacity &&
				cell.zone?.categoryId === old?.zone?.categoryId
			);
		})
	)
		return;
	return cells;
}
