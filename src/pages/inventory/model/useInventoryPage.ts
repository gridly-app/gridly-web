import { useMemo, useState } from "react";
import {
	type Stock,
	selectInventoryLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";

import type { InventoryStock } from "./inventoryStock";

export function useInventoryPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScope(selectInventoryLive);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("all");
	const [selected, setSelected] = useState<Stock | null>(null);
	const searchQuery = search.trim().toLowerCase();
	const productNames = useMemo(
		() =>
			new Map(warehouse.products.map((product) => [product.id, product.name])),
		[warehouse.products],
	);
	const zoneNames = useMemo(
		() =>
			new Map(
				warehouse.cells.map((cell) => [`${cell.x},${cell.y}`, cell.zone?.name]),
			),
		[warehouse.cells],
	);

	async function writeOffStock(value: {
		revision?: number | undefined;
		id: string;
		quantity: number;
		reason: string;
	}) {
		await execute("writeoff", value);
		setSelected((current) => (current === selected ? null : current));
	}

	const visibleStock = useMemo<InventoryStock[]>(
		() =>
			warehouse.stock
				.map((stock) => ({
					...stock,
					productName: productNames.get(stock.product),
					zoneName: zoneNames.get(stock.cell) || "Зона хранения",
				}))
				.filter(
					(stock) =>
						(stock.productName || "").toLowerCase().includes(searchQuery) &&
						(filter !== "expired" || stock.isExpired) &&
						(filter !== "reserved" ||
							(stock.reserved !== undefined && stock.reserved > 0)),
				),
		[warehouse.stock, productNames, zoneNames, searchQuery, filter],
	);

	function changeFilter(value: string) {
		setFilter(value || "all");
	}

	return {
		changeFilter,
		empty: warehouse.stock.length === 0,
		visibleStock,
		search,
		setSearch,
		filter,
		pending,
		openWriteOff: (stock: Stock) => setSelected({ ...stock }),
		closeWriteOff: () => setSelected(null),
		selected,
		writeOffStock,
	};
}
