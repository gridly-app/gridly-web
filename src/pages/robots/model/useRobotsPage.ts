import { useState } from "react";
import type { RobotInput } from "@/entities/warehouse";
import {
	type Robot,
	robotRoleLabels,
	selectRobotsLive,
	useLiveWarehouseScope,
} from "@/entities/warehouse";

export function useRobotsPage() {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectRobotsLive);
	const [search, setSearch] = useState("");
	const [editing, setEditing] = useState<Robot | "new" | null>(null);
	const searchQuery = search.toLowerCase();

	async function saveRobot(robot: RobotInput) {
		await execute("robot", robot);
		setEditing(null);
	}

	const visibleRobots = warehouse.robots
		.filter((robot) => robot.name.toLowerCase().includes(searchQuery))
		.map((robot) => ({
			...robot,
			canEdit: !!robot.allowedActions?.includes("edit"),
			canDelete: !!robot.allowedActions?.includes("delete"),
			rolesLabel: robot.roles.map((role) => robotRoleLabels[role]).join(", "),
		}));

	function removeRobot(robotId: string) {
		return command("deleteRobot", robotId);
	}

	return {
		canCreate: !!warehouse.allowedActions?.includes("create-robot"),
		removeRobot,
		empty: warehouse.robots.length === 0,
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
