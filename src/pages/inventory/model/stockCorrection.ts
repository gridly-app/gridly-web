import {
	type Cell,
	cellKey,
	productOccupancy,
	type Stock,
	stockZoneId,
	stockZoneName,
	storageCellTypes,
	type Warehouse,
} from "@/entities/warehouse";

export function correctionZones(
	warehouse: Pick<Warehouse, "cells" | "products" | "categories">,
	productId: string,
) {
	const product = warehouse.products.find((item) => item.id === productId);
	const category = warehouse.categories.find(
		(item) => item.id === product?.category,
	);
	const zones = new Map<
		string,
		{ value: string; label: string; cells: Cell[] }
	>();
	for (const cell of warehouse.cells) {
		if (!storageCellTypes.includes(cell.type)) continue;
		if (category && (cell.type === "cold") !== category.cold) continue;
		if (
			product &&
			cell.zone?.categoryId &&
			cell.zone.categoryId !== product.category
		)
			continue;
		const value = stockZoneId(cell);
		const zone = zones.get(value) ?? {
			value,
			label: stockZoneName(cell),
			cells: [],
		};
		zone.cells.push(cell);
		zones.set(value, zone);
	}
	return [...zones.values()];
}

export function stockDestination(
	warehouse: Pick<Warehouse, "stock" | "products">,
	cells: Cell[],
	stock: Stock,
) {
	const previous = warehouse.stock.find((item) => item.id === stock.id);
	if (
		previous?.product === stock.product &&
		previous.quantity >= stock.quantity &&
		cells.some((cell) => cellKey(cell) === previous.cell)
	)
		return previous.cell;

	const product = warehouse.products.find((item) => item.id === stock.product);
	const requestedVolume = product
		? productOccupancy(product, [stock]).volume
		: null;
	const destinations =
		(stock.reserved ?? 0) > 0
			? cells.filter((cell) => cellKey(cell) === stock.cell)
			: cells;
	const candidates = destinations.map((cell) => {
		const key = cellKey(cell);
		const occupied = warehouse.stock.filter(
			(item) => item.cell === key && item.id !== stock.id,
		);
		let volume = 0;
		for (const item of occupied) {
			const storedProduct = warehouse.products.find(
				(p) => p.id === item.product,
			);
			volume += storedProduct
				? (productOccupancy(storedProduct, [item]).volume ?? 0)
				: 0;
		}
		return { key, volume, capacity: cell.capacity };
	});
	const fits = candidates.filter(
		(cell) =>
			cell.capacity === undefined ||
			requestedVolume === null ||
			cell.volume + requestedVolume <= cell.capacity + 1e-8,
	);
	return (
		fits.find((cell) => cell.key === stock.cell)?.key ??
		fits.sort((a, b) => a.volume - b.volume)[0]?.key
	);
}
