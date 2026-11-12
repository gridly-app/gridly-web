import type { Warehouse } from "../../model/warehouse";
import type { StatePatch } from "../contracts/statePatch";

export function applyRobotPatch(
	current: Warehouse,
	patch: StatePatch,
): Warehouse {
	const known = new Set(current.robots.map((r) => r.id));
	if (patch.robots?.some((r) => !known.has(r.robot_id)))
		throw new Error("Требуется загрузить новых роботов");
	const robots = new Map((patch.robots ?? []).map((r) => [r.robot_id, r]));
	if (robots.size !== (patch.robots?.length ?? 0))
		throw new Error("Повторный робот в событии");
	const inBounds = (point: { x: number; y: number }) =>
		point.x < current.width && point.y < current.height;
	return {
		...current,
		stateVersion: patch.state_version,
		tick: patch.tick,
		asOf: patch.committed_at,
		robots: current.robots.map((robot) => {
			const update = robots.get(robot.id);
			if (!update)
				return { ...robot, motionPath: undefined, motionTimed: undefined };
			const steps = update.microsteps;
			if (
				![
					update.from,
					update.to,
					...(steps?.flatMap((step) => [step.from, step.to]) ?? []),
				].every(inBounds)
			)
				throw new Error("Траектория выходит за пределы карты");
			let path = [update.from, update.to];
			if (steps?.length) {
				const ordered = [...steps].sort((a, b) => a.slot - b.slot);
				// Server slots may be numbered 0..4 or 1..5. Retain idle slots.
				const origin = ordered.some((step) => step.slot === 0) ? 0 : 1;
				if (
					new Set(ordered.map((step) => step.slot)).size !== ordered.length ||
					ordered.some((step) => step.slot >= origin + 5)
				)
					throw new Error("Некорректные слоты движения");
				path = [update.from];
				for (let slot = origin; slot < origin + 5; slot++) {
					const step = ordered.find((item) => item.slot === slot);
					const previous = path[path.length - 1] ?? update.from;
					if (
						step &&
						(step.from.x !== previous.x || step.from.y !== previous.y)
					)
						throw new Error("Разрыв траектории движения");
					path.push(step?.to ?? previous);
				}
				const last = path.at(-1);
				if (last?.x !== update.to.x || last?.y !== update.to.y)
					throw new Error("Некорректная траектория");
			}
			return {
				...robot,
				x: update.to.x,
				y: update.to.y,
				status: update.status,
				motionPath: path,
				motionTimed: !!steps?.length,
			};
		}),
	};
}
