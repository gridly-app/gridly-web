import { expect, test } from "bun:test";
import { act } from "react";
import { mountDom } from "../../../../../tests/support/dom";
import { shipment } from "../../../../../tests/support/shipment";
import { useShipmentCalendar } from "./useShipmentCalendar";

test("weekly grouping gives the table and CSV the same date column label", async () => {
	const dom = mountDom();
	let current: ReturnType<typeof useShipmentCalendar> | undefined;
	const sample = shipment();

	function Calendar() {
		current = useShipmentCalendar({
			shipment: sample,
			items: sample.items,
			priority: null,
			showPriority: false,
		});

		return null;
	}

	try {
		act(() => dom.root.render(<Calendar />));

		if (!current) throw new Error("Calendar did not render");

		const model = current;
		act(() => model.setFilters({ ...model.filters, weekly: true }));

		expect(current.visibleColumns[0]).toEqual(["date", "Неделя с"]);
	} finally {
		await dom.close();
	}
});
