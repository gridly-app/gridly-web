import { useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { environment } from "@/shared/config";
import { errorMessage } from "@/shared/lib";

export function useMapSimulation(
	warehouse: Pick<Warehouse, "robots">,
	command: CommandExecutor,
) {
	const [error, setError] = useState("");
	const activeRobots = warehouse.robots.filter(
		(robot) => robot.status !== "idle",
	).length;

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
		activeRobots,
		supported: environment.sandboxMode,
	};
}
