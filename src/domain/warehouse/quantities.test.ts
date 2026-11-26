import { expect, test } from "bun:test";

import {
	processedQuantity,
	remainingQuantity,
	reservedQuantity,
	totalReserved,
	writeOffLimit,
} from "./quantities";

test("quantities the server did not report count as zero in calculations", () => {
	expect(reservedQuantity({})).toBe(0);
	expect(totalReserved([{ reserved: 2 }, {}, { reserved: 3 }])).toBe(5);
	expect(writeOffLimit({})).toBe(0);
	expect(writeOffLimit({ availableQuantity: 7 })).toBe(7);
});

test("an order line's remaining quantity subtracts put-away and written-off units", () => {
	expect(processedQuantity({ putaway: 4 })).toBe(4);
	expect(processedQuantity({ putaway: 4, writtenOff: 1 })).toBe(5);
	expect(remainingQuantity({ quantity: 10, putaway: 4, writtenOff: 1 })).toBe(
		5,
	);
	expect(remainingQuantity({ quantity: 10 })).toBe(10);
});
