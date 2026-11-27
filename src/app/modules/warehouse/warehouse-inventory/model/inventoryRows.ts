import {
	forecastLabel,
	incomingProduct,
	type Product,
	productPrice,
	type Stock,
	type stockZoneCells,
	stockZoneId,
	type stockZoneNames,
	totalReserved,
} from "@/domain/warehouse";
import { dateKey } from "@/shared/lib";

import type { InventoryStock } from "./inventoryStock";
import type { InventoryWarehouse } from "./warehouseResources";

interface InventorySearch {
	category: string;
	productFilter: string | null;
	searchQuery: string;
}

function matchesProduct(
	productId: string,
	product: Product | undefined,
	search: InventorySearch,
) {
	const matchesFilter =
		!search.productFilter || productId === search.productFilter;
	const matchesCategory =
		search.category === "all" || product?.category === search.category;

	return matchesFilter && matchesCategory;
}

export function expectedDeliveries(
	warehouse: InventoryWarehouse,
	cadence: number | null,
	search: InventorySearch,
) {
	function replenishment(productId: string) {
		const incoming = incomingProduct(productId, warehouse, cadence);
		const deliveries = incoming.deliveries.map((delivery) => ({
			...delivery,
			label: forecastLabel(delivery.forecast, warehouse.timezone),
		}));

		return { ...incoming, deliveries };
	}

	return warehouse.products
		.filter((product) => matchesProduct(product.id, product, search))
		.filter((product) =>
			`${product.name} ${product.sku}`
				.toLowerCase()
				.includes(search.searchQuery),
		)
		.map((product) => ({ ...product, incoming: replenishment(product.id) }))
		.filter((item) => item.incoming.quantity > 0);
}

function matchesStockFilter(
	stock: Stock,
	product: Product | undefined,
	filter: string,
) {
	const isUnpriced =
		stock.quantity > 0 && productPrice(product?.price) === null;
	const isReserved = stock.reserved !== undefined && stock.reserved > 0;
	const checks: Record<string, boolean> = {
		unpriced: isUnpriced,
		expired: Boolean(stock.isExpired),
		reserved: isReserved,
	};

	return checks[filter] ?? true;
}

export function stockRows(
	stock: Stock[],
	products: Map<string, Product>,
	zoneCells: ReturnType<typeof stockZoneCells>,
	zoneName: ReturnType<typeof stockZoneNames>,
	search: InventorySearch,
	filter: string,
): InventoryStock[] {
	function toRow(item: Stock): InventoryStock {
		const cell = zoneCells.get(item.cell);

		return {
			...item,
			zoneKey: cell ? stockZoneId(cell) : zoneName(item),
			productName: products.get(item.product)?.name,
			zoneName: zoneName(item),
		};
	}

	function matchesSearch(row: InventoryStock) {
		const sku = products.get(row.product)?.sku ?? "";
		const text = `${row.productName ?? ""} ${row.zoneName} ${row.batchId ?? row.id} ${sku}`;

		return text.toLowerCase().includes(search.searchQuery);
	}

	return stock
		.filter((item) =>
			filter === "zero" ? item.quantity === 0 : item.quantity > 0,
		)
		.filter((item) =>
			matchesProduct(item.product, products.get(item.product), search),
		)
		.map(toRow)
		.filter(matchesSearch)
		.filter((row) =>
			matchesStockFilter(row, products.get(row.product), filter),
		);
}

export function stockGroups(items: readonly InventoryStock[]) {
	const groups = new Map<string, InventoryStock[]>();

	for (const item of items) {
		const key = JSON.stringify([item.product, item.zoneKey]);
		const rows = groups.get(key) ?? [];

		rows.push(item);
		groups.set(key, rows);
	}

	return [...groups].flatMap(([key, rows]) => {
		const [first] = rows;

		if (!first) return [];

		return [
			{
				key,
				rows,
				productName: first.productName ?? "Товар",
				productId: first.product,
				zoneName: first.zoneName,
				quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
				reserved: rows.some((row) => row.reserved === undefined)
					? undefined
					: totalReserved(rows),
			},
		];
	});
}

export type StockGroup = ReturnType<typeof stockGroups>[number];

export function sourceOrderTotals(rows: readonly InventoryStock[]) {
	const totals = new Map<string, { firstStockId: string; quantity: number }>();

	for (const stock of rows) {
		const orderId = stock.sourceOrderId;

		if (!orderId) continue;

		const total = totals.get(orderId) ?? {
			firstStockId: stock.id,
			quantity: 0,
		};

		total.quantity += stock.quantity;
		totals.set(orderId, total);
	}

	return totals;
}

function isInRange(day: string | null, from: string, to: string) {
	if (from && (!day || day < from)) return false;
	if (to && (!day || day > to)) return false;

	return true;
}

export function writeOffRows(
	warehouse: InventoryWarehouse,
	products: Map<string, Product>,
	search: InventorySearch,
	{ filter, from, to }: { filter: string; from: string; to: string },
) {
	return (warehouse.writeOffs ?? [])
		.filter((item) => {
			const product = products.get(item.product);
			const day = dateKey(item.time, warehouse.timezone);
			const matchesPrice = filter !== "unpriced" || item.price === null;
			const matchesSearch = (product?.name || item.product)
				.toLowerCase()
				.includes(search.searchQuery);

			return (
				item.quantity > 0 &&
				matchesPrice &&
				matchesProduct(item.product, product, search) &&
				isInRange(day, from, to) &&
				matchesSearch
			);
		})
		.map((item) => ({
			...item,
			productName: products.get(item.product)?.name || item.product,
		}));
}

export type WriteOffRow = ReturnType<typeof writeOffRows>[number];

export type ExpectedProduct = ReturnType<typeof expectedDeliveries>[number];
