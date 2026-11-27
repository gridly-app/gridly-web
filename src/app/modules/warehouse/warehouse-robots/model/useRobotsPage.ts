import { useState } from "react";

import {
	type Cell,
	type Robot,
	robotAssignment,
	type RobotInput,
	robotRoleLabels,
} from "@/domain/warehouse";
import { useLiveWarehouseScreen } from "@/ports/warehouse";

import { type RobotsWarehouse, warehouseResources } from "./warehouseResources";

const directionLabels: Record<string, string> = {
	inbound: "Приёмка",
	outbound: "Отгрузка",
};

function roleLabel(role: string) {
	return robotRoleLabels[role] ?? directionLabels[role] ?? role;
}

function spawnCells(warehouse: RobotsWarehouse): Cell[] {
	if (!warehouse.published) return [];

	const isOccupied = (cell: Cell) =>
		warehouse.robots.some((robot) => robot.x === cell.x && robot.y === cell.y);

	return warehouse.cells.filter(
		(cell) =>
			(cell.type === "aisle" || cell.type === "charge") && !isOccupied(cell),
	);
}

export function useRobotsPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScreen(warehouseResources);
	const [status, setStatus] = useState("all");
	const [role, setRole] = useState("all");
	const [search, setSearch] = useState("");
	const [editing, setEditing] = useState<Robot | "new" | null>(null);
	const searchQuery = search.trim().toLowerCase();

	async function saveRobot(robot: RobotInput) {
		await execute("robot", robot);
		setEditing(null);
	}

	async function removeRobot(robotId: string) {
		await execute("deleteRobot", robotId);
	}

	const visibleRobots = warehouse.robots
		.filter((robot) => status === "all" || robot.status === status)
		.filter((robot) => role === "all" || robot.roles.includes(role))
		.map((robot) => ({
			...robot,
			canEdit: Boolean(robot.allowedActions?.includes("edit")),
			canDelete: Boolean(robot.allowedActions?.includes("delete")),
			rolesLabel: robot.roles.map(roleLabel).join(", "),
			assignment: robotAssignment(robot, warehouse),
		}))
		.filter((robot) => {
			const { title, order, detail } = robot.assignment;
			const text = [robot.name, title, order?.number, detail]
				.join(" ")
				.toLowerCase();

			return text.includes(searchQuery);
		});
	const roleOptions = [
		...new Set(warehouse.robots.flatMap((robot) => robot.roles)),
	].map((value) => ({
		value,
		label: roleLabel(value),
	}));

	return {
		warehouseId: warehouse.id,
		spawnCells: spawnCells(warehouse),
		status,
		setStatus,
		statuses: [...new Set(warehouse.robots.map((robot) => robot.status))],
		role,
		setRole,
		roleOptions,
		search,
		setSearch,
		canCreate: Boolean(warehouse.allowedActions?.includes("create-robot")),
		isEmpty: visibleRobots.length === 0,
		visibleRobots,
		editing,
		editingRobot: editing === "new" ? undefined : (editing ?? undefined),
		setEditing,
		pending,
		saveRobot,
		removeRobot,
	};
}

export type RobotRow = ReturnType<
	typeof useRobotsPage
>["visibleRobots"][number];
