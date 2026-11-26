import { expect, test } from "bun:test";

import { shipmentStatus } from "./shipmentStatus";

test("an interrupted shipment preserves the supplied reason", () => {
	const order = {
		state: "on_hold",
		status_reason: "Ожидаем документы",
	} as const;

	expect(shipmentStatus(order, "inbound")).toEqual({
		label: "Приостановлена",
		tone: "warning",
		reason: "Ожидаем документы",
	});
});
