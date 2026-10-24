import {
	cancelOrder,
	type Order,
	startOrder,
	type Warehouse,
} from "@/entities/warehouse";
import { scenarioDate } from "../simulation/context";
import type { CommandHandlers } from "./commandHandlers";

function findOrder(warehouse: Warehouse, id: string): Order {
	const order = warehouse.orders.find((o) => o.id === id);

	if (!order) {
		throw new Error("Заказ не найден");
	}

	return order;
}

export const orderHandlers: Pick<
	CommandHandlers,
	"order" | "start" | "confirm" | "cancel" | "orderAction" | "taskAction"
> = {
	orderAction() {
		throw new Error("Это действие требует подключения нового API");
	},
	taskAction() {
		throw new Error("Это действие требует подключения нового API");
	},
	order: (warehouse, order) => {
		const existing = warehouse.orders.findIndex((o) => o.id === order.id);

		if (existing >= 0) {
			if (warehouse.orders[existing].status !== "draft") {
				throw new Error("Изменять можно только черновик");
			}
			warehouse.orders[existing] = order;
		} else {
			warehouse.orders.unshift(order);
		}
	},
	start(warehouse, id, context) {
		const order = findOrder(warehouse, id);

		if (!["draft", "blocked"].includes(order.status)) {
			throw new Error("Заказ уже запущен");
		}
		startOrder(
			warehouse,
			order,
			scenarioDate(context.now(), warehouse.timezone),
		);
	},
	confirm(warehouse, id) {
		const order = findOrder(warehouse, id);

		if (order.status !== "waiting") {
			throw new Error("Заказ не ожидает подтверждения");
		}
		order.stage++;
		if (order.stage >= order.manual.filter(Boolean).length) {
			order.status = "running";
		}
	},
	cancel(warehouse, id) {
		const order = findOrder(warehouse, id);

		cancelOrder(warehouse, order);
	},
};
