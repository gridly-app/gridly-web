import type { Robot, RobotInput } from "@/entities/warehouse";
import { formNumber, formText, id } from "@/shared/lib";

export function robotFromForm(data: FormData, robot?: Robot): RobotInput {
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

	return {
		revision: robot?.revision,
		id: robot?.id || id(),
		name: formText(data, "name"),
		roles,
		x: robot?.x,
		y: robot?.y,
		speed,
		duration,
		capacity,
		status: robot?.status || "idle",
	};
}
