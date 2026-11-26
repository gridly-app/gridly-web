import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { shipment } from "../../../../../../tests/support/shipment";

import { FactDetails } from "../../ui/calendar/FactDetails/FactDetails";
import { guestShipmentView } from "./guestShipmentView";

test("calendar-only access shows the permitted item name without its hidden grade", () => {
	const sample = shipment();
	const view = guestShipmentView({
		...sample,
		id: "guest-1",
		sections: ["calendar"],
		calendar_items: [{ order_line_id: "coffee", sku: "C-1", name: "Кофе" }],
	});

	expect(view.items).toBeNull();
	expect(view.calendar?.items).toEqual([
		{ order_line_id: "coffee", sku: "C-1", name: "Кофе", grade: null },
	]);

	if (!view.calendar) throw new Error("Expected calendar access");

	const html = renderToStaticMarkup(
		createElement(FactDetails, {
			items: view.calendar.items,
			facts: sample.actual,
			timeZone: sample.order.time_zone,
		}),
	);

	expect(html).toContain("C-1 · Кофе");
	expect(html).not.toContain("Арабика");
});

test("item access adds the grade to calendar details without exposing other item fields", () => {
	const view = guestShipmentView({
		...shipment(),
		id: "guest-1",
		sections: ["calendar", "items"],
	});

	expect(view.calendar?.items).toEqual([
		{ order_line_id: "coffee", sku: "C-1", name: "Кофе", grade: "Арабика" },
	]);
});
