import { useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

export function useMapSimulation(
	warehouse: Pick<Warehouse, "robots" | "summary" | "allowedActions">,
	command: CommandExecutor,
) {
	const [error, setError] = useState("");
	const activeRobots = warehouse.summary?.activeRobots;
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
		supported: !!warehouse.allowedActions?.includes("simulation"),
	};
}
