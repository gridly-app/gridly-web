import type { Order } from "@/domain/warehouse";

import type { CatalogMovementsWarehouse } from "./warehouseResources";

export type ProductMovement = {
	id: string;
	order: Order | null;
	quantity: number;
	type: string;
	time: string;
	reason: string;
};

const shippedStatuses = ["shipped", "completed"];

function movedQuantity(order: Order, line: Order["lines"][number]) {
	if (order.kind === "outbound")
		return shippedStatuses.includes(order.status) ? line.quantity : 0;

	const receivedQuantity = order.status === "received" ? line.quantity : 0;

	return line.putaway ?? receivedQuantity;
}

function orderMovement(order: Order, productId: string): ProductMovement[] {
	const lines = order.lines.filter((line) => line.product === productId);
	const quantity = lines.reduce(
		(sum, line) => sum + movedQuantity(order, line),
		0,
	);
	const isInbound = order.kind === "inbound";

	if (quantity <= 0) return [];

	return [
		{
			id: `order:${order.id}`,
			order,
			quantity: isInbound ? quantity : -quantity,
			type: isInbound ? "Размещение" : "Отгрузка",
			time: "",
			reason: "",
		},
	];
}

function movementTime(movement: ProductMovement) {
	return movement.time || movement.order?.created || "";
}

export function productMovements(
	warehouse: Pick<CatalogMovementsWarehouse, "orders" | "writeOffs">,
	productId: string,
) {
	const orderMovements = warehouse.orders.flatMap((order) =>
		orderMovement(order, productId),
	);
	const writeOffs = (warehouse.writeOffs ?? [])
		.filter((item) => item.product === productId)
		.map((item): ProductMovement => ({
			id: `writeoff:${item.id}`,
			order: null,
			quantity: -item.quantity,
			type: "Списание",
			time: item.time,
			reason: item.reason,
		}));

	return [...orderMovements, ...writeOffs].sort((a, b) =>
		movementTime(b).localeCompare(movementTime(a)),
	);
}

export function productOrders(orders: Order[], productId: string) {
	return orders
		.flatMap((order) => {
			const lines = order.lines.filter((line) => line.product === productId);
			const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);

			return lines.length ? [{ order, quantity }] : [];
		})
		.sort((a, b) => b.order.created.localeCompare(a.order.created));
}
