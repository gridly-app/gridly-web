import { expect, test } from "bun:test";
import { stockDto } from "@/entities/warehouse/api/contracts/inventoryDto";
import { stockFromDto } from "@/entities/warehouse/api/repositories/restMappers";

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
