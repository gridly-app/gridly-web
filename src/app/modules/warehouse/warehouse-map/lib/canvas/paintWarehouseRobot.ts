import type { GridPosition, Robot } from "@/domain/warehouse";

import { cellCenter } from "../../config/grid";
import { robotColors, routeColors } from "../../config/mapTheme";

const robotRouteDash = [5, 3];
const robotCornerRadius = 5;

function robotColor(robot: Robot) {
	if (robot.currentTask?.carrying) return robotColors.carrying;
	if (robot.status === "waiting") return robotColors.waiting;
	if (robot.status === "idle") return robotColors.idle;

	return robotColors.working;
}

function paintRobotRoute(
	context: CanvasRenderingContext2D,
	robot: Robot,
	x: number,
	y: number,
	size: number,
) {
	const route = robot.currentTask?.route || robot.returnRoute;

	if (!route?.length) return;

	context.save();
	context.strokeStyle = robot.currentTask?.carrying
		? routeColors.outbound
		: routeColors.inbound;
	context.lineWidth = Math.max(2, size * 0.08);
	context.setLineDash(robotRouteDash);
	context.beginPath();
	context.moveTo(x, y);

	for (const point of route) {
		context.lineTo(cellCenter(point.x, size), cellCenter(point.y, size));
	}

	context.stroke();
	context.restore();
}

export function paintWarehouseRobot(
	context: CanvasRenderingContext2D,
	robot: Robot,
	position: GridPosition,
	size: number,
	index: number,
	isSelected: boolean,
) {
	const x = cellCenter(position.x, size);
	const y = cellCenter(position.y, size);

	if (isSelected) paintRobotRoute(context, robot, x, y, size);

	context.fillStyle = robotColor(robot);
	context.beginPath();
	context.roundRect(
		x - size * 0.34,
		y - size * 0.32,
		size * 0.68,
		size * 0.64,
		robotCornerRadius,
	);
	context.fill();

	if (isSelected) {
		context.strokeStyle = routeColors.inbound;
		context.lineWidth = 2;
		context.strokeRect(
			x - size * 0.43,
			y - size * 0.43,
			size * 0.86,
			size * 0.86,
		);
	}

	context.fillStyle = robotColors.label;
	context.font = `bold ${Math.max(10, size * 0.27)}px Geist, sans-serif`;
	context.textAlign = "center";
	context.fillText(String(index + 1).padStart(2, "0"), x, y + 4);
}
