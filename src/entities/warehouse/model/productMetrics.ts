import type { Order, Product, Stock } from "./warehouse";

export function productPrice(raw: string | undefined): number | null {
	if (!raw?.trim()) return null;
	const value = Number(raw.replace(",", "."));
	return Number.isFinite(value) && value >= 0 ? value : null;
}
export function orderValue(order: Order, products: readonly Product[]) {
	if (!order.lines.length)
		return {
			value: 0,
			unknown: order.quantity ?? 1,
			label: "Нет данных о составе",
		};
	const prices = new Map(
		products.map((product) => [product.id, productPrice(product.price)]),
	);
	let value = 0,
		unknown = 0;
	for (const line of order.lines) {
		const price = prices.get(line.product);
		if (price === undefined || price === null) unknown += line.quantity;
		else value += price * line.quantity;
	}
	return {
		value,
		unknown,
		label:
			unknown && !value
				? "Цена не задана"
				: `${unknown ? "от " : ""}${value.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 })}`,
	};
}
export function productOccupancy(product: Product, stock: readonly Stock[]) {
	const quantity = stock
		.filter((item) => item.product === product.id)
		.reduce((sum, item) => sum + item.quantity, 0);
	const unitVolume = product.volume.trim()
		? Number(product.volume.replace(",", "."))
		: NaN;
	return {
		quantity,
		volume:
			Number.isFinite(unitVolume) && unitVolume >= 0
				? quantity * unitVolume
				: null,
	};
}
