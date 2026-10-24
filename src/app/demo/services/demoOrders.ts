import { expired, startOrder, type Warehouse } from "@/entities/warehouse";
import {
	type SimulationContext,
	scenarioDate,
	systemContext,
} from "../simulation/context";

export function replenishDemoOrders(
	warehouse: Warehouse,
	context: SimulationContext = systemContext,
	now = context.now(),
) {
	if (!warehouse.demoVersion || Number(warehouse.tick) % 24 !== 0) {
		return;
	}
	const queued = warehouse.orders.filter(
		(order) =>
			order.demoAutoStart &&
			["draft", "running", "waiting"].includes(order.status),
	);

	if (queued.length >= 12) {
		return;
	}
	const products = warehouse.products.filter((product) => !product.archived);

	for (let index = 0; index < Math.min(4, 12 - queued.length); index++) {
		const product =
			products[
				(Math.floor(Number(warehouse.tick) / 24) * 4 + index) % products.length
			];

		if (!product) {
			continue;
		}
		const available = warehouse.stock
			.filter(
				(stock) =>
					stock.product === product.id &&
					!expired(stock.expires, scenarioDate(now, warehouse.timezone)),
			)
			.reduce((sum, stock) => sum + stock.quantity - stock.reserved, 0);
		const kind =
			available >= 4 && (Math.floor(Number(warehouse.tick) / 24) + index) % 2
				? "outbound"
				: "inbound";
		const expires = product.shelf
			? scenarioDate(
					new Date(now.getTime() + product.shelf * 86400000),
					warehouse.timezone,
				)
			: "";

		warehouse.orders.push({
			id: context.nextId(),
			number: `${kind === "inbound" ? "IN" : "OUT"}-D${warehouse.tick}-${index + 1}`,
			kind,
			party: kind === "inbound" ? "Демо · пополнение" : "Демо · доставка",
			status: "draft",
			lines: [
				{ product: product.id, quantity: kind === "inbound" ? 8 : 4, expires },
			],
			manual: [false, false, false, false],
			stage: 0,
			created: now.toISOString(),
			demoAutoStart: true,
		});
	}
	const completed = warehouse.orders.filter(
		(order) =>
			order.demoAutoStart &&
			(["received", "shipped", "cancelled"].includes(order.status) ||
				(order.status === "blocked" &&
					!order.allocations?.length &&
					!warehouse.robots.some((r) => r.currentTask?.orderId === order.id))),
	);
	const obsolete = new Set(
		completed
			.slice(0, Math.max(0, completed.length - 60))
			.map((order) => order.id),
	);

	warehouse.orders = warehouse.orders.filter(
		(order) => !obsolete.has(order.id),
	);
}

export function startQueuedOrders(warehouse: Warehouse, today?: string) {
	for (const order of warehouse.orders.filter(
		(order) =>
			order.demoAutoStart && ["draft", "blocked"].includes(order.status),
	)) {
		try {
			startOrder(warehouse, order, today);
		} catch (error) {
			order.status = "blocked";
			order.reason = error instanceof Error ? error.message : String(error);
		}
	}
}
