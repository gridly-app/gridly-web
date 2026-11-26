import { expect, test } from "bun:test";
import { stockDto } from "@/app/modules/warehouse-data/api/inventory/inventoryDto";
import { stockFromDto } from "@/app/modules/warehouse-data/api/repositories/restMappers";

const stock = {
	id: "stock-1",
	batch_id: "batch-1",
	product_id: "product-1",
	quantity: 10,
	reserved_quantity: 10,
	expires_on: "2000-01-01",
	robot_id: "robot-1",
};

test("inventory keeps backend statuses regardless of date, reserves and location", () => {
	const mapped = stockFromDto(
		stockDto.parse({
			...stock,
			is_expired: false,
			can_write_off: true,
		}),
	);
	expect(mapped.isExpired).toBe(false);
	expect(mapped.canWriteOff).toBe(true);
});

test("inventory does not infer statuses omitted by the backend", () => {
	const mapped = stockFromDto(stockDto.parse(stock));
	expect(mapped.isExpired).toBeUndefined();
	expect(mapped.canWriteOff).toBeUndefined();
	expect(mapped.sourceOrderId).toBeUndefined();
});

test("inventory keeps the source order supplied by the backend", () => {
	const mapped = stockFromDto(
		stockDto.parse({ ...stock, source_order_id: "order-in-1042" }),
	);

	expect(mapped.sourceOrderId).toBe("order-in-1042");
});

test("inventory keeps source order metadata when it is embedded in the response", () => {
	const mapped = stockFromDto(
		stockDto.parse({
			...stock,
			source_order: {
				id: "receipt-1",
				number: "ПР-6000",
				counterparty_text: "Поставщик",
			},
		}),
	);

	expect(mapped.sourceOrderId).toBe("receipt-1");
	expect(mapped.sourceOrder).toEqual({
		id: "receipt-1",
		number: "ПР-6000",
		party: "Поставщик",
	});
});
