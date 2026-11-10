import {
	type Cell,
	type Robot,
	type RobotInput,
	robotCreateSchema,
	robotUpdateSchema,
} from "@/entities/warehouse";
import { formNumber, formText } from "@/shared/lib";

export function robotFromForm(
	data: FormData,
	robot?: Robot | undefined,
	spawnCells: readonly Cell[] = [],
): RobotInput {
	const roles = data.getAll("roles").map(String);
	const speed = formNumber(data, "speed");
	const duration = formNumber(data, "duration");
	const capacity = formText(data, "capacity");

	if (!roles.length) {
		throw new Error("Выберите хотя бы одну роль");
	}
	if (!Number.isInteger(speed) || speed < 1 || speed > 5) {
		throw new Error("Скорость должна быть целым числом от 1 до 5");
	}
	if (!Number.isInteger(duration) || duration < 1 || duration > 20) {
		throw new Error(
			"Длительность действия должна быть целым числом от 1 до 20",
		);
	}
	if (
		!/^\d+(\.\d{1,3})?$/.test(capacity) ||
		!Number.isFinite(Number(capacity)) ||
		Number(capacity) <= 0
	) {
		throw new Error(
			"Грузоподъёмность: положительное число, максимум 3 знака после точки",
		);
	}

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
	const cell = spawnCells.find((c) => `${c.x},${c.y}` === position);
	if (!cell) throw new Error("Выберите свободную стартовую клетку");
	return robotCreateSchema.parse({ ...parameters, x: cell.x, y: cell.y });
}
