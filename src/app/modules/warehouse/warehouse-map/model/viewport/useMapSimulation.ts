import { useState } from "react";
import type { CommandExecutor, Warehouse } from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";

const activeRobotStatuses = new Set(["working", "moving", "carrying"]);

export function robotCounts(warehouse: Pick<Warehouse, "robots" | "summary">) {
	const activeFallback = warehouse.robots.filter(({ status }) =>
		activeRobotStatuses.has(status),
	).length;

	return {
		robotCount: warehouse.summary?.robotCount ?? warehouse.robots.length,
		activeRobots: warehouse.summary?.activeRobots ?? activeFallback,
	};
}

export function useMapSimulation(
	warehouse: Pick<Warehouse, "robots" | "summary" | "allowedActions">,
	command: CommandExecutor,
) {
	const [error, setError] = useState("");
	const { robotCount, activeRobots } = robotCounts(warehouse);

	async function toggle() {
		setError("");

		try {
			await command("simulation");
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	return {
		error,
		toggle,
		robotCount,
		activeRobots,
		supported: !!warehouse.allowedActions?.includes("simulation"),
	};
}
