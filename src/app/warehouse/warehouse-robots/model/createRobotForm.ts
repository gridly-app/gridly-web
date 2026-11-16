import type { Cell, Robot, RobotInput } from "@/domain/warehouse";
import { robotRoleOptions } from "@/domain/warehouse";
import { robotFromForm } from "./robotFromForm";

export interface RobotFormOptions {
	robot?: Robot | undefined;
	spawnCells: readonly Cell[];
	onSave: (robot: RobotInput) => Promise<void>;
}

export function createRobotForm({
	onSave,
	robot,
	spawnCells,
}: RobotFormOptions) {
	function handleSubmit(data: FormData): Promise<void> {
		return onSave(robotFromForm(data, robot, spawnCells));
	}

	const roles = robotRoleOptions.map((role) => ({
		...role,
		checked: robot?.roles.includes(role.value) || !robot,
	}));

	return { handleSubmit, roles };
}
