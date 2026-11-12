import type { Robot, Warehouse } from "./warehouse";

export function robotAssignment(
	robot: Robot,
	warehouse: Pick<Warehouse, "orders" | "products">,
) {
	const task = robot.currentTask;
	if (!task)
		return {
			title:
				robot.status === "charging"
					? "На зарядке"
					: robot.returnRoute?.length
						? "Возвращается на стоянку"
						: robot.status === "idle"
							? "Ожидает задачу"
							: "Задача не передана",
			detail: "",
			order: undefined,
		};
	const order = warehouse.orders.find((item) => item.id === task.orderId);
	const product = warehouse.products.find((item) => item.id === task.productId);
	const title =
		order?.kind === "inbound"
			? task.carrying
				? "Размещает поставку"
				: "Разгружает поставку"
			: order?.kind === "outbound"
				? task.carrying
					? "Везёт на отгрузку"
					: "Забирает товар для отгрузки"
				: task.label;
	return {
		title,
		order: {
			id: task.orderId,
			kind: order?.kind,
			number: order?.number ?? task.orderId,
		},
		detail: `${product?.name ?? task.productId} · ${task.quantity} шт.`,
	};
}
