import type { Order } from "@/domain/warehouse";

import type { GuestLink } from "../api/guestLink.dto";

type OrderDetails = Pick<Order, "number" | "party">;

export type GuestLinkOrder = {
	id: string;
	number: OrderDetails["number"] | undefined;
	party: OrderDetails["party"] | undefined;
	label: string;
};

export function guestLinkOrders(
	link: Pick<GuestLink, "order_ids">,
	orderById: ReadonlyMap<string, OrderDetails>,
): GuestLinkOrder[] {
	return [...new Set(link.order_ids)].map((id) => {
		const order = orderById.get(id);

		return {
			id,
			number: order?.number,
			party: order?.party,
			label: order?.number ?? id,
		};
	});
}

export function guestLinkCustomer(orders: readonly GuestLinkOrder[]) {
	const customers = new Set<string>();

	for (const { party } of orders) {
		if (party) customers.add(party);
	}

	return [...customers].join(", ") || "Заказчик не указан";
}

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
