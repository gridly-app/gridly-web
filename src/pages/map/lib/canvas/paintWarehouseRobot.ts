import type { GridPosition, Robot } from "@/entities/warehouse";

const ROBOT_ROUTE_DASH = [5, 3];

export function paintWarehouseRobot(
	context: CanvasRenderingContext2D,
	robot: Robot,
	{ x: xCell, y: yCell }: GridPosition,
	size: number,
	index: number,
	selected: boolean,
) {
	const x = 32 + xCell * size + size / 2;
	const y = 32 + yCell * size + size / 2;

	const route = robot.currentTask?.route || robot.returnRoute;

	if (selected && route?.length) {
		context.save();
		context.strokeStyle = robot.currentTask?.carrying ? "#4f83c4" : "#e86536";
		context.lineWidth = Math.max(2, size * 0.08);
		context.setLineDash(ROBOT_ROUTE_DASH);
		context.beginPath();
		context.moveTo(x, y);
		for (const point of route) {
			context.lineTo(32 + (point.x + 0.5) * size, 32 + (point.y + 0.5) * size);
		}
		context.stroke();
		context.restore();
	}
	context.fillStyle = robot.currentTask?.carrying
		? "#e86536"
		: robot.status === "waiting"
			? "#e9ac4b"
			: robot.status === "idle"
				? "#8b9580"
				: "#596bc2";
	context.beginPath();
	context.roundRect(
		x - size * 0.34,
		y - size * 0.32,
		size * 0.68,
		size * 0.64,
		5,
	);
	context.fill();
	if (selected) {
		context.strokeStyle = "#e86536";
		context.lineWidth = 2;
		context.strokeRect(
			x - size * 0.43,
			y - size * 0.43,
			size * 0.86,
			size * 0.86,
		);
	}
	context.fillStyle = "white";
	context.font = `bold ${Math.max(10, size * 0.27)}px Geist, sans-serif`;
	context.textAlign = "center";
	context.fillText(String(index + 1).padStart(2, "0"), x, y + 4);
}
