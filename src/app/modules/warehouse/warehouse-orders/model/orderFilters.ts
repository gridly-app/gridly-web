import { type Order, type Product, productPrice } from "@/domain/warehouse";
import { dateKey } from "@/shared/lib";

type OrderLine = Order["lines"][number];

export interface OrderFilters {
	kind: Order["kind"];
	status: string;
	category: string;
	unpriced: boolean;
	from: string;
	to: string;
	search: string;
}

export function filterOrders(
	orders: readonly Order[],
	products: readonly Product[],
	timeZone: string,
	filters: OrderFilters,
) {
	const productById = new Map(products.map((product) => [product.id, product]));
	const searchQuery = filters.search.toLowerCase();

	function isInPeriod(order: Order) {
		const day = dateKey(order.created, timeZone);

		if (filters.from && (!day || day < filters.from)) return false;
		if (filters.to && (!day || day > filters.to)) return false;

		return true;
	}

	function isInCategory(line: OrderLine) {
		if (filters.category === "all") return true;

		return productById.get(line.product)?.category === filters.category;
	}

	function isUnpriced(line: OrderLine) {
		const price = productById.get(line.product)?.price;

		return (
			line.quantity > 0 && isInCategory(line) && productPrice(price) === null
		);
	}

	function matches(order: Order) {
		if (order.kind !== filters.kind) return false;
		if (!isInPeriod(order)) return false;
		if (filters.unpriced && !order.lines.some(isUnpriced)) return false;
		if (filters.status !== "all" && order.status !== filters.status)
			return false;
		if (filters.category !== "all" && !order.lines.some(isInCategory))
			return false;

		return (order.number + order.party).toLowerCase().includes(searchQuery);
	}

	return orders.filter(matches);
}
