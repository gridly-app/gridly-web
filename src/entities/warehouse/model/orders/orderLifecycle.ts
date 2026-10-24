import { id } from "@/shared/lib";
import { cellKey, storageCells } from "../layout/zones";
import { expired } from "../warehouse/expired";
import type { Order, RobotTask, Warehouse } from "../warehouse/schemas";

type Allocation = NonNullable<Order["allocations"]>[number];

export function occupiedStorageVolume(warehouse: Warehouse) {
	const products = new Map(warehouse.products.map((p) => [p.id, p]));
	const volume = new Map<string, number>();
	const add = (cell: string, quantity: number, product: string) =>
		volume.set(
			cell,
			(volume.get(cell) || 0) +
				quantity * Number(products.get(product)?.volume || 0),
		);
	for (const stock of warehouse.stock)
		add(stock.cell, stock.quantity, stock.product);
	for (const order of warehouse.orders) {
		if (
			order.kind !== "inbound" ||
			!["running", "waiting"].includes(order.status)
		)
			continue;
		for (const a of order.allocations || [])
			add(a.cell, a.quantity - a.delivered, order.lines[a.lineIndex].product);
	}
	return volume;
}

export function startOrder(warehouse: Warehouse, order: Order, today?: string) {
	if (order.status !== "draft" && order.status !== "blocked")
		throw new Error("Заказ уже запущен");
	if (!warehouse.published) throw new Error("Сначала опубликуйте карту");
	for (const role of order.kind === "inbound" ? ["unload", "sort"] : ["ship"]) {
		if (!warehouse.robots.some((robot) => robot.roles.includes(role)))
			throw new Error(`Нет робота с ролью «${role}»`);
	}
	const allocations: Allocation[] = [];
	const reserved = new Map(warehouse.stock.map((s) => [s.id, s.reserved]));
	const occupied = occupiedStorageVolume(warehouse);
	for (const [lineIndex, line] of order.lines.entries()) {
		const product = warehouse.products.find((p) => p.id === line.product);
		if (!product) throw new Error(`Товар ${line.product} не найден`);
		const unit = Number(product.volume);
		if (
			!(unit > 0) ||
			!Number.isFinite(unit) ||
			!Number.isInteger(line.quantity) ||
			line.quantity <= 0
		)
			throw new Error("Некорректное количество или объём товара");
		let left = line.quantity - (order.processed?.[lineIndex] || 0);
		if (order.kind === "outbound") {
			const stocks = warehouse.stock
				.filter((s) => s.product === product.id && !expired(s.expires, today))
				.sort((a, b) =>
					(a.expires || "9999").localeCompare(b.expires || "9999"),
				);
			for (const stock of stocks) {
				const quantity = Math.min(
					left,
					stock.quantity - (reserved.get(stock.id) || 0),
				);
				if (quantity <= 0) continue;
				allocations.push({
					lineIndex,
					stockId: stock.id,
					cell: stock.cell,
					quantity,
					delivered: 0,
				});
				reserved.set(stock.id, (reserved.get(stock.id) || 0) + quantity);
				left -= quantity;
			}
			if (left > 0)
				throw new Error(
					`Недостаточно товара: нужно ${line.quantity}, не хватает ${left}`,
				);
		} else {
			if (expired(line.expires, today))
				throw new Error("Нельзя принять просроченную партию");
			const shelves = storageCells(warehouse, product);
			if (!shelves.length)
				throw new Error(`Нет зоны для размещения товара «${product.name}»`);
			for (const shelf of shelves) {
				const key = cellKey(shelf);
				const quantity = Math.min(
					left,
					Math.max(
						0,
						Math.floor(
							(shelf.capacity - (occupied.get(key) || 0) + 1e-9) / unit,
						),
					),
				);
				if (quantity <= 0) continue;
				allocations.push({ lineIndex, cell: key, quantity, delivered: 0 });
				occupied.set(key, (occupied.get(key) || 0) + quantity * unit);
				left -= quantity;
			}
			if (left > 0) throw new Error("Недостаточно места для размещения");
		}
	}
	if (order.kind === "outbound")
		for (const stock of warehouse.stock)
			stock.reserved = reserved.get(stock.id) || 0;
	order.allocations = allocations;
	order.status = order.manual.some(Boolean) ? "waiting" : "running";
	order.stage = 0;
	delete order.reason;
}

export function commitTaskDelivery(
	warehouse: Warehouse,
	task: RobotTask,
	nextId: () => string = id,
): boolean {
	const order = warehouse.orders.find((o) => o.id === task.orderId);
	if (!order || !task.id || order.deliveredTaskIds?.includes(task.id))
		return false;
	if (order.status !== "running") throw new Error("Заказ не выполняется");
	const allocation = order.allocations?.[task.allocationIndex ?? -1];
	const line = order.lines[task.lineIndex];
	if (
		!allocation ||
		allocation.lineIndex !== task.lineIndex ||
		allocation.cell !== task.shelfKey ||
		!line ||
		line.product !== task.productId ||
		task.quantity <= 0 ||
		allocation.delivered + task.quantity > allocation.quantity ||
		(order.processed?.[task.lineIndex] || 0) + task.quantity > line.quantity
	)
		throw new Error("Некорректное распределение задачи");
	if (order.kind === "outbound") {
		const stock = warehouse.stock.find((s) => s.id === allocation.stockId);
		if (
			!stock ||
			stock.reserved < task.quantity ||
			stock.quantity < task.quantity
		)
			throw new Error("Резерв партии утрачен");
		stock.quantity -= task.quantity;
		stock.reserved -= task.quantity;
	} else {
		warehouse.stock.push({
			id: nextId(),
			product: line.product,
			quantity: task.quantity,
			reserved: 0,
			expires: line.expires,
			cell: allocation.cell,
		});
		order.putaways ||= [];
		order.putaways.push({
			lineIndex: task.lineIndex,
			cell: allocation.cell,
			quantity: task.quantity,
		});
	}
	allocation.delivered += task.quantity;
	order.processed ||= order.lines.map(() => 0);
	order.processed[task.lineIndex] += task.quantity;
	order.deliveredTaskIds ||= [];
	order.deliveredTaskIds.push(task.id);
	order.stage = 2;
	warehouse.stock = warehouse.stock.filter((s) => s.quantity > 0);
	return true;
}

export function completeOrder(warehouse: Warehouse, order: Order) {
	if (["received", "shipped", "cancelled"].includes(order.status)) return;
	if (
		order.lines.some((l, i) => (order.processed?.[i] || 0) !== l.quantity) ||
		warehouse.robots.some((r) => r.currentTask?.orderId === order.id)
	)
		return;
	order.status = order.kind === "inbound" ? "received" : "shipped";
	order.stage = 3;
	delete order.reason;
}

export function cancelOrder(warehouse: Warehouse, order: Order) {
	if (["received", "shipped", "cancelled"].includes(order.status))
		throw new Error("Заказ уже завершён");
	const robots = warehouse.robots.filter(
		(r) => r.currentTask?.orderId === order.id,
	);
	if (robots.some((r) => r.currentTask?.carrying))
		throw new Error("Дождитесь доставки груза перед отменой");
	for (const a of order.allocations || []) {
		if (order.kind !== "outbound") continue;
		const stock = warehouse.stock.find((s) => s.id === a.stockId);
		if (stock) stock.reserved -= a.quantity - a.delivered;
	}
	for (const robot of robots) {
		delete robot.currentTask;
		robot.status = "idle";
	}
	order.allocations = [];
	order.status = "cancelled";
	delete order.reason;
}
