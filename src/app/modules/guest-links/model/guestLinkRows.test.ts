import { expect, test } from "bun:test";

import type { GuestLink } from "../api/guestLink.dto";
import { filterGuestLinkRows } from "./guestLinkRows";

const link: GuestLink = {
	id: "link-1",
	name: "Ссылка для партнёра",
	revision: 1,
	status: "active",
	expires_at: "2099-02-28T12:00:00Z",
	order_ids: ["order-1", "old-order"],
	sections: [],
};

const orders = new Map([["order-1", { number: "ЗК-2087", party: "Вектор" }]]);

test("searches order numbers, customers and IDs of unavailable orders", () => {
	for (const search of ["ЗК-2087", "Вектор", "old-order"]) {
		const rows = filterGuestLinkRows([link], orders, search, "active");

		expect(rows.map(({ link, customer }) => [link.id, customer])).toEqual([
			["link-1", "Вектор"],
		]);
	}
});

test("filters link status while searching the same warehouse", () => {
	const revoked = {
		...link,
		id: "link-2",
		status: "revoked",
	} satisfies GuestLink;
	const rows = filterGuestLinkRows(
		[link, revoked],
		orders,
		"ЗК-2087",
		"revoked",
	);

	expect(rows.map(({ link }) => link.id)).toEqual(["link-2"]);
});
