import type { Order } from "@/domain/warehouse";

import type { GuestLink } from "../api/guestLink.dto";

export function guestLinkCustomer(
	link: Pick<GuestLink, "order_ids">,
	orders: ReadonlyMap<string, Pick<Order, "party">>,
) {
	const customers = new Set<string>();

	for (const id of link.order_ids) {
		const party = orders.get(id)?.party;

		if (party) customers.add(party);
	}

	return [...customers].join(", ") || "Заказчик не указан";
}
