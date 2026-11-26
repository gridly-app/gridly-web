import type { Stock } from "./inventory";
import type { Order } from "./order";

type OrderLine = Order["lines"][number];

export function reservedQuantity(stock: Pick<Stock, "reserved">) {
	return stock.reserved ?? 0;
}

export function totalReserved(stocks: readonly Pick<Stock, "reserved">[]) {
	return stocks.reduce((sum, stock) => sum + reservedQuantity(stock), 0);
}

export function writeOffLimit(stock: Pick<Stock, "availableQuantity">) {
	return stock.availableQuantity ?? 0;
}

export function processedQuantity(
	line: Pick<OrderLine, "putaway" | "writtenOff">,
) {
	return (line.putaway ?? 0) + (line.writtenOff ?? 0);
}

export function remainingQuantity(
	line: Pick<OrderLine, "quantity" | "putaway" | "writtenOff">,
) {
	return line.quantity - processedQuantity(line);
}
