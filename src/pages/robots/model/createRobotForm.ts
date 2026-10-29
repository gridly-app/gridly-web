import type { Robot, RobotInput } from "@/entities/warehouse";
import { robotRoleOptions } from "@/entities/warehouse";
import { robotFromForm } from "./robotFromForm";

export interface RobotFormOptions {
	robot?: Robot | undefined;
	onSave: (robot: RobotInput) => Promise<void>;
}

export function createRobotForm({ onSave, robot }: RobotFormOptions) {
	function handleSubmit(data: FormData): Promise<void> {
		return onSave(robotFromForm(data, robot));
	}

	const roles = robotRoleOptions.map((role) => ({
		...role,
		checked: robot?.roles.includes(role.value) || !robot,
	}));

	return { handleSubmit, roles };
}
