import {
	type Cell,
	type Robot,
	type RobotInput,
	robotCreateSchema,
	robotParameterLimits,
	robotUpdateSchema,
} from "@/domain/warehouse";
import { formNumber, formText, UserError } from "@/shared/lib";

const capacityPattern = /^\d+(\.\d{1,3})?$/;

function isValidCapacity(capacity: string) {
	const value = Number(capacity);

	return capacityPattern.test(capacity) && Number.isFinite(value) && value > 0;
}

function validateParameters(
	roles: string[],
	speed: number,
	duration: number,
	capacity: string,
) {
	if (!roles.length) throw new UserError("Выберите хотя бы одну роль");

	if (!robotCreateSchema.shape.speed.safeParse(speed).success) {
		const { min, max } = robotParameterLimits.speed;

		throw new UserError(
			`Скорость должна быть целым числом от ${min} до ${max}`,
		);
	}

	if (!robotCreateSchema.shape.duration.safeParse(duration).success) {
		const { min, max } = robotParameterLimits.duration;

		throw new UserError(
			`Длительность действия должна быть целым числом от ${min} до ${max}`,
		);
	}

	if (!isValidCapacity(capacity)) {
		throw new UserError(
			"Грузоподъёмность: положительное число, максимум 3 знака после точки",
		);
	}
}

export function robotFromForm(
	data: FormData,
	robot?: Robot | undefined,
	spawnCells: readonly Cell[] = [],
): RobotInput {
	const roles = data.getAll("roles").map(String);
	const speed = formNumber(data, "speed");
	const duration = formNumber(data, "duration");
	const capacity = formText(data, "capacity");

	validateParameters(roles, speed, duration, capacity);

	const parameters = {
		name: formText(data, "name"),
		roles,
		speed,
		duration,
		capacity,
	};

	if (robot)
		return robotUpdateSchema.parse({
			...parameters,
			id: robot.id,
			revision: robot.revision,
		});

	const position = formText(data, "position");
	const cell = spawnCells.find((item) => `${item.x},${item.y}` === position);

	if (!cell) throw new UserError("Выберите свободную стартовую клетку");

	return robotCreateSchema.parse({ ...parameters, x: cell.x, y: cell.y });
}
