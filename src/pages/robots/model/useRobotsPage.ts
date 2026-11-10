import { useState } from "react";
import type { RobotInput } from "@/entities/warehouse";
import {
	type Robot,
	robotAssignment,
	robotRoleLabels,
	selectRobotsLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";

const roleLabel = (role: string) =>
	robotRoleLabels[role] ??
	{ inbound: "Приёмка", outbound: "Отгрузка" }[role] ??
	role;
export function useRobotsPage() {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectRobotsLive);
	const [status, setStatus] = useState("all");
	const [role, setRole] = useState("all");
	const [search, setSearch] = useState("");
	const [editing, setEditing] = useState<Robot | "new" | null>(null);
	const searchQuery = search.toLowerCase();

	async function saveRobot(robot: RobotInput) {
		await execute("robot", robot);
		setEditing(null);
	}

	const visibleRobots = warehouse.robots
		.filter(
			(r) =>
				(status === "all" || r.status === status) &&
				(role === "all" || r.roles.includes(role)),
		)

		.map((robot) => ({
			...robot,
			canEdit: !!robot.allowedActions?.includes("edit"),
			canDelete: !!robot.allowedActions?.includes("delete"),
			rolesLabel: robot.roles.map((role) => roleLabel(role)).join(", "),
			assignment: robotAssignment(robot, warehouse),
		}))
		.filter((robot) =>
			[
				robot.name,
				robot.assignment.title,
				robot.assignment.order?.number,
				robot.assignment.detail,
			]
				.join(" ")
				.toLowerCase()
				.includes(searchQuery.trim()),
		);

	function removeRobot(robotId: string) {
		return command("deleteRobot", robotId);
	}

	return {
		warehouseId: warehouse.id,
		spawnCells: warehouse.published
			? warehouse.cells.filter(
					(c) =>
						(c.type === "aisle" || c.type === "charge") &&
						!warehouse.robots.some((r) => r.x === c.x && r.y === c.y),
				)
			: [],
		status,
		setStatus,
		role,
		setRole,
		statuses: [...new Set(warehouse.robots.map((r) => r.status))],
		roleOptions: [...new Set(warehouse.robots.flatMap((r) => r.roles))].map(
			(role) => ({ value: role, label: roleLabel(role) }),
		),
		canCreate: !!warehouse.allowedActions?.includes("create-robot"),
		removeRobot,
		empty: visibleRobots.length === 0,
		editingRobot: editing === "new" ? undefined : editing || undefined,
		visibleRobots,
		setEditing,
		search,
		setSearch,
		pending,
		editing,
		saveRobot,
	};
}
