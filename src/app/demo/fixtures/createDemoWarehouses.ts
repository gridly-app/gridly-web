import type { Warehouse } from "@/entities/warehouse";
import type { DemoFixture } from "../runtime/warehouseStore";

export function createDemoWarehouses(createFixture: () => DemoFixture) {
	const warehouses = structuredClone(createFixture().warehouses);

	return namespaceDemoWarehouses(warehouses);
}

export function namespaceDemoWarehouses(warehouses: Warehouse[]) {
	warehouses.forEach((warehouse, index) => {
		warehouse.id = `demo-warehouse-${index + 1}`;
		warehouse.running = false;
		if (
			warehouse.orders.every(
				(o, i) => o.id === `${warehouse.id}-order-${i + 1}`,
			) &&
			warehouse.robots.every(
				(r, i) => r.id === `${warehouse.id}-robot-${i + 1}`,
			) &&
			warehouse.stock.every((s, i) => s.id === `${warehouse.id}-stock-${i + 1}`)
		)
			return;
		const orders = new Map(
			warehouse.orders.map((order, i) => [
				order.id,
				`${warehouse.id}-order-${i + 1}`,
			]),
		);
		const robots = new Map(
			warehouse.robots.map((robot, i) => [
				robot.id,
				`${warehouse.id}-robot-${i + 1}`,
			]),
		);

		const stocks = new Map(
			warehouse.stock.map((stock, i) => [
				stock.id,
				`${warehouse.id}-stock-${i + 1}`,
			]),
		);

		for (const order of warehouse.orders) {
			order.id = orders.get(order.id) ?? order.id;
			for (const allocation of order.allocations || [])
				if (allocation.stockId)
					allocation.stockId =
						stocks.get(allocation.stockId) || allocation.stockId;
		}
		for (const robot of warehouse.robots) {
			robot.id = robots.get(robot.id) ?? robot.id;
			if (robot.currentTask) {
				robot.currentTask.orderId =
					orders.get(robot.currentTask.orderId) || robot.currentTask.orderId;
			}
		}
		warehouse.stock.forEach((stock, i) => {
			stock.id = `${warehouse.id}-stock-${i + 1}`;
			if (stock.cell.startsWith("robot:")) {
				stock.cell = `robot:${robots.get(stock.cell.slice(6)) || stock.cell.slice(6)}`;
			}
		});
	});

	return warehouses;
}
