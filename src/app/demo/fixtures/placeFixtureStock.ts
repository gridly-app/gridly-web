import { cellKey, storageCells, type Warehouse } from "@/entities/warehouse";

export function placeFixtureStock(warehouse: Warehouse, nextId: () => string) {
	const occupied = new Map<string, number>();
	const additions: Warehouse["stock"] = [];
	for (const stock of warehouse.stock) {
		const product = warehouse.products.find((p) => p.id === stock.product);
		if (!product) throw new Error(`Неизвестный товар ${stock.product}`);
		const unit = Number(product.volume);
		const shelves = storageCells(warehouse, product);
		const preferred = shelves.find((c) => cellKey(c) === stock.cell);
		const candidates = preferred
			? [preferred, ...shelves.filter((c) => c !== preferred)]
			: shelves;
		let left = stock.quantity;
		let first = true;
		let reserved = stock.reserved;
		for (const cell of candidates) {
			const key = cellKey(cell);
			const quantity = Math.min(
				left,
				Math.max(
					0,
					Math.floor((cell.capacity - (occupied.get(key) || 0) + 1e-9) / unit),
				),
			);
			if (!quantity) continue;
			const held = Math.min(reserved, quantity);
			additions.push({
				...stock,
				id: first ? stock.id : nextId(),
				cell: key,
				quantity,
				reserved: held,
			});
			first = false;
			reserved -= held;
			left -= quantity;
			occupied.set(key, (occupied.get(key) || 0) + quantity * unit);
			if (!left) break;
		}
		if (left)
			throw new Error(`Недостаточно места в сценарии для ${product.name}`);
	}
	warehouse.stock = additions;
}
