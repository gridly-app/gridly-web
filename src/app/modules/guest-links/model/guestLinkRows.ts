import { guestSections } from "@/domain/shipment";
import { textSearch } from "@/shared/lib";

import type { GuestLink } from "../api/guestLink.dto";
import {
	guestLinkCustomer,
	type GuestLinkOrder,
	guestLinkOrders,
} from "./guestLinkOrders";

export type GuestLinkRow = {
	link: GuestLink;
	customer: string;
	orders: GuestLinkOrder[];
};

export function filterGuestLinkRows(
	links: GuestLink[],
	orderById: Parameters<typeof guestLinkOrders>[1],
	search: string,
	status: string,
): GuestLinkRow[] {
	const matches = textSearch(search);
	const rows: GuestLinkRow[] = [];

	for (const link of links) {
		if (status !== "all" && link.status !== status) continue;

		const orders = guestLinkOrders(link, orderById);

		if (!matches(guestLinkSearchFields(link, orders))) continue;

		rows.push({ link, orders, customer: guestLinkCustomer(orders) });
	}

	return rows;
}

function guestLinkSearchFields(link: GuestLink, orders: GuestLinkOrder[]) {
	const orderLabels = orders.map(({ number, party, label }) =>
		number === undefined ? label : `${party} ${number}`,
	);
	const sectionLabels = link.sections.map((section) => guestSections[section]);

	return [link.name, ...orderLabels, ...sectionLabels];
}
