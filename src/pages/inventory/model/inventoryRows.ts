import {
	forecastLabel,
	incomingProduct,
	type Product,
	productPrice,
	type Stock,
	type stockZoneCells,
	stockZoneId,
	type stockZoneNames,
	type Warehouse,
} from "@/entities/warehouse";
import type { InventoryStock } from "./inventoryStock";

interface InventorySearch {
	category: string;
	productFilter: string | null;
	searchQuery: string;
}

export function expectedDeliveries(
	warehouse: Warehouse,
	cadence: number | null,
	{ category, productFilter, searchQuery }: InventorySearch,
) {
	function replenishment(productId: string) {
		const incoming = incomingProduct(productId, warehouse, cadence);
		return {
			...incoming,
			deliveries: incoming.deliveries.map((delivery) => ({
				...delivery,
				label: forecastLabel(delivery.forecast, warehouse.timezone),
			})),
		};
	}
	return warehouse.products
		.filter(
			(product) =>
				(!productFilter || product.id === productFilter) &&
				(category === "all" || product.category === category) &&
				`${product.name} ${product.sku}`.toLowerCase().includes(searchQuery),
		)
		.map((product) => ({
			...product,
			incoming: replenishment(product.id),
		}))
		.filter((item) => item.incoming.quantity > 0);
}

export function stockRows(
	stock: Stock[],
	products: Map<string, Product>,
	zoneCells: ReturnType<typeof stockZoneCells>,
	zoneName: ReturnType<typeof stockZoneNames>,
	{ category, productFilter, searchQuery }: InventorySearch,
	filter: string,
): InventoryStock[] {
	return stock
		.filter(
			(s) =>
				(filter === "zero" ? s.quantity === 0 : s.quantity > 0) &&
				(!productFilter || s.product === productFilter) &&
				(category === "all" || products.get(s.product)?.category === category),
		)
		.map((stock) => {
			const cell = zoneCells.get(stock.cell);
			return {
				...stock,
				zoneKey: cell ? stockZoneId(cell) : zoneName(stock),
				productName: products.get(stock.product)?.name,
				zoneName: zoneName(stock),
			};
		})
		.filter(
			(stock) =>
				`${stock.productName ?? ""} ${stock.zoneName} ${stock.batchId ?? stock.id} ${products.get(stock.product)?.sku ?? ""}`
					.toLowerCase()
					.includes(searchQuery) &&
				(filter !== "unpriced" ||
					(stock.quantity > 0 &&
						productPrice(products.get(stock.product)?.price) === null)) &&
				(filter !== "expired" || stock.isExpired) &&
				(filter !== "reserved" ||
					(stock.reserved !== undefined && stock.reserved > 0)),
		);
}

export function writeOffRows(
	warehouse: Warehouse,
	products: Map<string, Product>,
	{ category, productFilter, searchQuery }: InventorySearch,
	{ filter, from, to }: { filter: string; from: string; to: string },
) {
	const dayFormatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: warehouse.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	return (warehouse.writeOffs ?? [])
		.filter((item) => {
			const product = products.get(item.product);
			const day = Number.isFinite(Date.parse(item.time))
				? dayFormatter.format(new Date(item.time))
				: "";
			return (
				(filter !== "unpriced" || item.price === null) &&
				(!productFilter || item.product === productFilter) &&
				item.quantity > 0 &&
				(category === "all" || product?.category === category) &&
				(!from || (!!day && day >= from)) &&
				(!to || (!!day && day <= to)) &&
				(product?.name || item.product).toLowerCase().includes(searchQuery)
			);
		})
		.map((item) => ({
			...item,
			productName: products.get(item.product)?.name || item.product,
		}));
}
