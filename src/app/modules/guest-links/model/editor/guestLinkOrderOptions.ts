import type { Order } from "@/domain/warehouse";

export function guestLinkOrderOptions(
	orders: Pick<Order, "id" | "number" | "party">[],
	orderIds: string[],
) {
	const availableIds = new Set(orders.map(({ id }) => id));
	const selectedOrderIds = new Set(orderIds);
	const unavailableOrders = orderIds
		.filter((id) => !availableIds.has(id))
		.map((id) => ({ id, number: id, party: "Заказ недоступен" }));

	return {
		orderOptions: [...orders, ...unavailableOrders],
		selectedOrderIds,
		selectedOrders: orders.filter(({ id }) => selectedOrderIds.has(id)),
		hasUnavailableOrders: unavailableOrders.length > 0,
	};
}
