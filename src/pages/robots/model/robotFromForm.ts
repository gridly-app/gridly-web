import type { Robot, RobotInput } from "@/entities/warehouse";
import { formNumber, formText } from "@/shared/lib";

export function robotFromForm(
	data: FormData,
	robot?: Robot | undefined,
): RobotInput {
	const roles = data.getAll("roles").map(String);
	const speed = formNumber(data, "speed");
	const duration = formNumber(data, "duration");
	const capacity = formText(data, "capacity");

	if (!roles.length) {
		throw new Error("Выберите хотя бы одну роль");
	}
	if (!Number.isInteger(speed) || speed < 1) {
		throw new Error("Скорость должна быть целым положительным числом");
	}
	if (!Number.isInteger(duration) || duration < 1) {
		throw new Error(
			"Длительность действия должна быть целым положительным числом",
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

	return {
		revision: robot?.revision,
		id: robot?.id,
		name: formText(data, "name"),
		roles,
		speed,
		duration,
		capacity,
	};
}
