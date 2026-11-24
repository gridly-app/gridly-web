import { expect, test } from "bun:test";
import { shipment } from "../../../../../tests/support/shipment";
import { shipmentProgress } from "./shipmentProgress";

test("connections use the next supplied milestone and dates retain their actual or planned meaning", () => {
	const sample = shipment();
	sample.milestones = [
		{
			code: "accepted",
			state: "completed",
			occurred_at: "2026-11-12T00:00:00Z",
			planned_at: null,
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
	const model = shipmentProgress(sample, "outbound");

	expect(model.steps[0]).toMatchObject({
		isConnected: true,
		dateLabel: "12.11.2026, 03:00",
		isComplete: true,
	});
	expect(model.steps[1]).toMatchObject({
		isCurrent: true,
		isConnected: false,
		dateLabel: "План · 13.11.2026, 03:00",
		note: "В работе",
	});
	expect(model.steps[2]).toMatchObject({
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

	expect(shipmentProgress(sample, "outbound").steps[0]).toMatchObject({
		dateLabel: null,
		isDateUnknown: true,
	});
});

test("an interrupted shipment preserves the supplied reason and inbound labels", () => {
	const sample = shipment();
	sample.order.state = "on_hold";
	sample.order.status_reason = "Ожидаем документы";
	const model = shipmentProgress(sample, "inbound");

	expect(model).toMatchObject({
		statusLabel: "Приостановлена",
		tone: "warning",
		reason: "Ожидаем документы",
		hasMilestones: false,
	});
	expect(model.steps[1]?.label).toBe("Подготовка у поставщика");
	expect(model.steps.at(-1)?.label).toBe("Принят на складе");
});
