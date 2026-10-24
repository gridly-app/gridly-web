import type { Order, Warehouse } from "@/entities/warehouse";
import { formText, id } from "@/shared/lib";

export interface OrderDraft {
	kind: Order["kind"];
	order?: Order;
	warehouse: Warehouse;
	lines: Order["lines"];
	manual: boolean[];
}

export function orderFromForm(
	data: FormData,
	{ kind, order, warehouse, lines, manual }: OrderDraft,
): Order {
	if (
		!lines.length ||
		lines.some(
			(line) =>
				!line.product || line.quantity < 1 || !Number.isInteger(line.quantity),
		)
	) {
		throw new Error("Добавьте товар и целое положительное количество");
	}
	if (
		kind === "inbound" &&
		lines.some(
			(line) =>
				(warehouse.products.find((product) => product.id === line.product)
					?.shelf || 0) > 0 && !line.expires,
		)
	) {
		throw new Error("Укажите срок годности скоропортящихся партий");
	}

	return {
		revision: order?.revision,
		id: order?.id || id(),
		number:
			order?.number ||
			`${kind === "inbound" ? "IN" : "OUT"}-${String(warehouse.orders.length + 25).padStart(4, "0")}`,
		kind,
		party: formText(data, "party"),
		status: "draft",
		lines,
		manual,
		stage: 0,
		created: order?.created || new Date().toISOString(),
	};
}
