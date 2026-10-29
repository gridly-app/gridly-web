import type { Robot, Warehouse } from "@/entities/warehouse";
import localLayout from "./Layout.module.css";
import mapStyles from "./WarehouseMap.module.css";

export interface RobotDetailsProps {
	robot: Robot;
	warehouse: Pick<Warehouse, "products" | "orders">;
}

export function RobotDetails({ robot, warehouse }: RobotDetailsProps) {
	const task = robot.currentTask;
	const product = warehouse.products.find(
		(product) => product.id === task?.productId,
	);
	const order = warehouse.orders.find((order) => order.id === task?.orderId);

	return (
		<div data-robot-id={robot.id}>
			<h3>{robot.name}</h3>
			<div className={mapStyles.detailLine}>
				<span>Положение</span>
				<b>
					{robot.x}, {robot.y}
				</b>
			</div>
			<div className={mapStyles.detailLine}>
				<span>Состояние</span>
				<b>
					{robot.status === "idle"
						? "Свободен"
						: task?.carrying
							? "Везёт груз"
							: robot.status === "working"
								? "Обрабатывает груз"
								: "В пути"}
				</b>
			</div>
			{task ? (
				<div
					className={mapStyles.robotCurrentTask}
					data-task-phase={task.phase}
				>
					<div className={localLayout.sectionCaption}>ТЕКУЩАЯ ЗАДАЧА</div>
					<p className={mapStyles.robotTaskLabel}>{task.label}</p>
					<div className={mapStyles.detailLine}>
						<span>Заказ</span>
						<b>{order?.number || task.orderId}</b>
					</div>
					<p>
						{product?.name || "Груз"} · {task.quantity} шт.
					</p>
					<div className={mapStyles.detailLine}>
						<span>Цель</span>
						<b>
							{task.target.x}, {task.target.y}
						</b>
					</div>
					<div className={mapStyles.detailLine}>
						<span>Осталось</span>
						<b>{Math.max(0, task.route.length - 1)} клеток</b>
					</div>
				</div>
			) : robot.returnRoute?.length ? (
				<div className={mapStyles.robotCurrentTask} data-task-phase="return">
					<div className={localLayout.sectionCaption}>ТЕКУЩАЯ ЗАДАЧА</div>
					<p className={mapStyles.robotTaskLabel}>Возврат на стоянку</p>
					<p>Осталось {Math.max(0, robot.returnRoute.length - 1)} клеток</p>
				</div>
			) : (
				<p className={localLayout.muted}>
					{robot.status === "idle"
						? "Ожидает следующей задачи"
						: "Данные текущей задачи пока не получены"}
				</p>
			)}
		</div>
	);
}
