import { useState } from "react";
import {
	expired,
	type Stock,
	selectInventoryLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";

export function useInventoryPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScope(selectInventoryLive);
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("all");
	const [selected, setSelected] = useState<Stock | null>(null);
	const searchQuery = search.trim().toLowerCase();
	const productNames = new Map(
		warehouse.products.map((product) => [product.id, product.name]),
	);
	const zoneNames = new Map(
		warehouse.cells.map((cell) => [`${cell.x},${cell.y}`, cell.zone?.name]),
	);
	const today = new Date().toLocaleDateString("sv-SE", {
		timeZone: warehouse.timezone,
	});

	async function writeOffStock(value: {
		revision?: number;
		id: string;
		quantity: number;
		reason: string;
	}) {
		await execute("writeoff", value);
		setSelected(null);
	}

	const visibleStock = warehouse.stock
		.map((stock) => ({
			...stock,
			productName: productNames.get(stock.product),
			zoneName: zoneNames.get(stock.cell) || "Зона хранения",
			isExpired: expired(stock.expires, today),
			canWriteOff:
				expired(stock.expires, today) &&
				stock.quantity > stock.reserved &&
				!stock.cell.startsWith("robot:"),
		}))
		.filter(
			(stock) =>
				(stock.productName || "").toLowerCase().includes(searchQuery) &&
				(filter !== "expired" || stock.isExpired) &&
				(filter !== "reserved" || stock.reserved > 0),
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
		setSelected,
		selected,
		writeOffStock,
	};
}
