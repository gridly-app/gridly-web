import { expect, test } from "bun:test";

import { readGuestLinkForm } from "./guestLinkForm";

test("rejects an impossible expiry date before JavaScript normalizes it", () => {
	const form = new FormData();
	form.set("name", "Заказчику");
	form.set("expires", "2099-02-30T12:00");

	const selection = {
		orderIds: ["order-1"],
		sections: [],
		hasUnavailableOrders: false,
	};
	const expiration = { initial: "", original: undefined };
	const result = readGuestLinkForm(form, selection, expiration);

	expect(result.input).toBeUndefined();
	expect(result.errors.expires).toBe("Укажите будущий срок действия.");
});

test("keeps sub-minute precision when editing an unchanged expiry", () => {
	const form = new FormData();
	form.set("name", "Заказчику");
	form.set("expires", "2099-02-28T12:00");

	const selection = {
		orderIds: ["order-1"],
		sections: [],
		hasUnavailableOrders: false,
	};
	const expiration = {
		initial: "2099-02-28T12:00",
		original: "2099-02-28T12:00:59.999Z",
	};
	const result = readGuestLinkForm(form, selection, expiration);

	expect(result.input?.expires_at).toBe("2099-02-28T12:00:59.999Z");
});

test("converts a date from a minute-precision input to an explicit UTC instant", () => {
	const form = new FormData();
	form.set("name", "Заказчику");
	form.set("expires", "2099-02-28T12:00");

	const selection = {
		orderIds: ["order-1"],
		sections: [],
		hasUnavailableOrders: false,
	};
	const expiration = { initial: "", original: undefined };
	const result = readGuestLinkForm(form, selection, expiration);

	expect(result.input?.expires_at).toBe("2099-02-28T12:00:00.000Z");
});
