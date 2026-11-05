import { expect, test } from "bun:test";
import { stockDto } from "../src/entities/warehouse/api/contracts/contract";
import { stockFromDto } from "../src/entities/warehouse/api/repositories/restMappers";

import { stockDestination } from "../src/pages/inventory/model/stockCorrection";

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
});

test("correction chooses storage within the selected zone and preserves a fitting location", () => {
	const product = {
		id: "p",
		name: "Чай",
		sku: "T-1",
		category: "food",
		price: "",
		shelf: 0,
		volume: "2",
	};
	const first = { x: 1, y: 1, type: "storage" as const, capacity: 6 };
	const second = { ...first, x: 2 };
	const part = {
		id: "part",
		cell: "1,1",
		product: product.id,
		quantity: 2,
		expires: "",
	};
	const occupied = { ...part, id: "other", quantity: 1 };
	const warehouse = { products: [product], stock: [part, occupied] };
	expect(stockDestination(warehouse, [first, second], part)).toBe("1,1");
	expect(
		stockDestination(warehouse, [first, second], { ...part, quantity: 3 }),
	).toBe("2,1");
	expect(
		stockDestination(warehouse, [first], { ...part, quantity: 4 }),
	).toBeUndefined();
	expect(
		stockDestination(warehouse, [first, second], {
			...part,
			quantity: 3,
			reserved: 1,
		}),
	).toBeUndefined();
	expect(
		stockDestination(warehouse, [{ ...first, capacity: 1 }, second], {
			...part,
			expires: "2027-06-01",
		}),
	).toBe("1,1");
});
