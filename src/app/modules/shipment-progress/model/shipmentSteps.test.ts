import { expect, test } from "bun:test";
import { shipment } from "../../../../../tests/support/shipment";
import { shipmentSteps } from "./shipmentSteps";

test("connections use the next supplied milestone and dates retain their actual or planned meaning", () => {
	const sample = shipment();
	sample.milestones = [
		{
			code: "accepted",
			state: "completed",
			occurred_at: "2026-11-12T00:00:00Z",
			planned_at: "2026-11-11T00:00:00Z",
			note: null,
		},
		{
			code: "warehouse_preparation",
			state: "current",
			occurred_at: null,
			planned_at: "2026-11-13T00:00:00Z",
			note: "В работе",
		},
	];
	const steps = shipmentSteps(
		sample.milestones,
		"outbound",
		sample.order.time_zone,
	);

	expect(steps[0]).toMatchObject({
		isConnected: true,
		date: { value: "2026-11-12T00:00:00Z", label: "12.11.2026, 03:00" },
		state: "completed",
	});
	expect(steps[1]).toMatchObject({
		state: "current",
		isConnected: false,
		date: { value: "2026-11-13T00:00:00Z", label: "План · 13.11.2026, 03:00" },
		note: "В работе",
	});
	expect(steps[2]).toMatchObject({
		statusLabel: "Нет данных об этапе",
		state: "pending",
	});
});

test("a completed milestone with only a planned date reports the actual date as unknown", () => {
	const sample = shipment();
	sample.milestones = [
		{
			code: "accepted",
			state: "completed",
			occurred_at: null,
			planned_at: "2026-11-12T00:00:00Z",
			note: null,
		},
	];

	const steps = shipmentSteps(
		sample.milestones,
		"outbound",
		sample.order.time_zone,
	);

	expect(steps[0]).toMatchObject({
		date: null,
		isDateUnknown: true,
	});
});

test("an inbound timeline uses supplier preparation and warehouse receipt labels", () => {
	const sample = shipment();
	const steps = shipmentSteps(
		sample.milestones,
		"inbound",
		sample.order.time_zone,
	);

	expect(steps[1]?.label).toBe("Подготовка у поставщика");
	expect(steps.at(-1)?.label).toBe("Принят на складе");
});
