import {
	cellLabels,
	type GridPosition,
	type Order,
	type Robot,
	type WarehouseView,
} from "@/domain/warehouse";

import styles from "../../shared.module.css";

const orderKindLabels: Record<Order["kind"], string> = {
	inbound: "Поставка",
	outbound: "Отгрузка",
};

function robotState(robot: Robot) {
	if (robot.status === "idle") return "Свободен";
	if (robot.currentTask?.carrying) return "Везёт груз";
	if (robot.status === "working") return "Обрабатывает груз";

	return "В пути";
}

function remainingCells(route: readonly GridPosition[]) {
	return Math.max(0, route.length - 1);
}

export function RobotDetails({
	robot,
	warehouse,
}: {
	robot: Robot;
	warehouse: Pick<
		WarehouseView<"catalog" | "orders" | "map">,
		"products" | "orders" | "cells"
	>;
}) {
	const task = robot.currentTask;

	function locationName(point: GridPosition) {
		const cell = warehouse.cells.find(
			(item) => item.x === point.x && item.y === point.y,
		);

		if (!cell) return "Зона не определена";

		return cell.zone?.name || cellLabels[cell.type];
	}

	function taskDetails() {
		if (task) {
			const product = warehouse.products.find(
				(item) => item.id === task.productId,
			);
			const order = warehouse.orders.find((item) => item.id === task.orderId);

			return (
				<div className={styles.robotCurrentTask} data-task-phase={task.phase}>
					<div className={styles.detailsSectionCaption}>ТЕКУЩАЯ ЗАДАЧА</div>
					<p className={styles.robotTaskLabel}>{task.label}</p>
					<div className={styles.detailLine}>
						<span>{order ? orderKindLabels[order.kind] : "Заказ"}</span>
						<b>{order?.number || task.orderId}</b>
					</div>
					<p>
						{product?.name || "Груз"} · {task.quantity} шт.
					</p>
					<div className={styles.detailLine}>
						<span>Цель</span>
						<b>{locationName(task.target)}</b>
					</div>
					<div className={styles.detailLine}>
						<span>Осталось</span>
						<b>{remainingCells(task.route)} клеток</b>
					</div>
				</div>
			);
		}

		if (robot.returnRoute?.length) {
			return (
				<div className={styles.robotCurrentTask} data-task-phase="return">
					<div className={styles.detailsSectionCaption}>ТЕКУЩАЯ ЗАДАЧА</div>
					<p className={styles.robotTaskLabel}>Возврат на стоянку</p>
					<p>Осталось {remainingCells(robot.returnRoute)} клеток</p>
				</div>
			);
		}

		const idleMessage =
			robot.status === "idle"
				? "Ожидает следующей задачи"
				: "Данные текущей задачи пока не получены";

		return <p className={styles.muted}>{idleMessage}</p>;
	}

	return (
		<div data-robot-id={robot.id}>
			<h3>{robot.name}</h3>
			<div className={styles.detailLine}>
				<span>Положение</span>
				<b>{locationName(robot)}</b>
			</div>
			<div className={styles.detailLine}>
				<span>Состояние</span>
				<b>{robotState(robot)}</b>
			</div>
			{taskDetails()}
		</div>
	);
}
