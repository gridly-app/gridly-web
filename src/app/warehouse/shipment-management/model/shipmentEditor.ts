import {
	type Actual,
	actualSchema,
	type Milestone,
	milestoneSchema,
	type Plan,
	planSchema,
	stages,
} from "@/domain/shipment";
import { UserError } from "@/shared/lib";
import type { WorkingShipment } from "./shipment.dto";

export const transportStages = (
	Object.keys(stages) as Milestone["code"][]
).slice(3);

export function editableMilestones(shipment: WorkingShipment): Milestone[] {
	return transportStages.map(
		(code) =>
			shipment.milestones.find((row) => row.code === code) ?? {
				code,
				state: "pending",
				occurred_at: null,
				planned_at: null,
				note: null,
			},
	);
}

export function shipmentDraft(
	shipment: WorkingShipment,
	priority: WorkingShipment["warehouse"]["priority"],
	reason: string,
	plan: Plan[],
	actual: Actual[],
	milestones: Milestone[],
) {
	const planned = planSchema.array().safeParse(plan);
	const shipped = actualSchema.array().safeParse(actual);
	const roadmap = milestoneSchema.array().safeParse(milestones);
	if (!planned.success || !shipped.success || !roadmap.success)
		throw new UserError("Проверьте даты, количество и товарные позиции.");
	if (
		new Set(plan.map((row) => JSON.stringify([row.date, row.order_line_id])))
			.size !== plan.length
	)
		throw new UserError(
			"Для одной позиции и даты допустима одна строка плана.",
		);
	for (const item of shipment.items) {
		for (const rows of [plan, actual]) {
			const total = rows
				.filter((row) => row.order_line_id === item.order_line_id)
				.reduce((sum, row) => sum + row.quantity, 0);
			if (
				total - item.quantity >
				Number.EPSILON * Math.max(1, item.quantity) * 8
			)
				throw new UserError(
					`Количество по позиции «${item.name}» превышает заказанное.`,
				);
		}
	}
	if (milestones.some((row) => row.state === "completed" && !row.occurred_at))
		throw new UserError("Укажите время для завершённых этапов.");
	if (milestones.filter((row) => row.state === "current").length > 1)
		throw new UserError("Выберите один текущий транспортный этап.");
	return {
		revision: shipment.revision,
		priority,
		status_reason: reason.trim() || null,
		plan,
		actual,
		transport_milestones: milestones,
	};
}

export function dateInput(value: string | null) {
	if (!value) return "";
	return new Date(value).toISOString().slice(0, 19);
}
export function utcInput(value: string) {
	return value ? new Date(`${value}Z`).toISOString() : null;
}
