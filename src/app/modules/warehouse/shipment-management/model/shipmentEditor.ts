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

import type { WorkingShipment } from "../api/shipment.dto";
import { quantityDifference } from "./quantityDifference";

export type ShipmentPlanRow = { clientId: string; entry: Plan };

export type ShipmentDraft = ReturnType<typeof shipmentDraft>;

const firstTransportStage: Milestone["code"] = "loading";
const stageCodes = Object.keys(stages) as Milestone["code"][];
const transportStages = stageCodes.slice(
	stageCodes.indexOf(firstTransportStage),
);

function pendingMilestone(code: Milestone["code"]): Milestone {
	return {
		code,
		state: "pending",
		occurred_at: null,
		planned_at: null,
		note: null,
	};
}

export function editableMilestones(shipment: WorkingShipment): Milestone[] {
	return transportStages.map(
		(code) =>
			shipment.milestones.find((row) => row.code === code) ??
			pendingMilestone(code),
	);
}

function hasDuplicatePlanRows(plan: Plan[]) {
	const keys = new Set(
		plan.map((row) => JSON.stringify([row.date, row.order_line_id])),
	);

	return keys.size !== plan.length;
}

function validateRowItems(shipment: WorkingShipment, rows: (Plan | Actual)[]) {
	const items = new Map(
		shipment.items.map((item) => [item.order_line_id, item]),
	);

	for (const row of rows) {
		const item = items.get(row.order_line_id);

		if (!item)
			throw new UserError(
				`Позиция «${row.order_line_id}» не входит в текущий заказ.`,
			);
		if (row.unit !== item.unit) {
			throw new UserError(
				`Единица измерения позиции «${item.name}» должна быть ${item.unit}.`,
			);
		}
	}
}

function validateItemTotals(
	shipment: WorkingShipment,
	rows: (Plan | Actual)[],
) {
	for (const item of shipment.items) {
		const total = rows
			.filter((row) => row.order_line_id === item.order_line_id)
			.reduce((sum, row) => sum + row.quantity, 0);

		if (quantityDifference(item.quantity, total) < 0) {
			throw new UserError(
				`Количество по позиции «${item.name}» превышает заказанное.`,
			);
		}
	}
}

function validateMilestones(milestones: Milestone[]) {
	const hasUndatedCompletion = milestones.some(
		(row) => row.state === "completed" && !row.occurred_at,
	);
	const currentCount = milestones.filter(
		(row) => row.state === "current",
	).length;

	if (hasUndatedCompletion)
		throw new UserError("Укажите время для завершённых этапов.");
	if (currentCount > 1)
		throw new UserError("Выберите один текущий транспортный этап.");
}

export function shipmentDraft(
	shipment: WorkingShipment,
	priority: WorkingShipment["warehouse"]["priority"],
	reason: string,
	plan: Plan[],
	actual: Actual[],
	milestones: Milestone[],
) {
	const isPlanValid = planSchema.array().safeParse(plan).success;
	const isActualValid = actualSchema.array().safeParse(actual).success;
	const areMilestonesValid = milestoneSchema
		.array()
		.safeParse(milestones).success;

	if (!isPlanValid || !isActualValid || !areMilestonesValid) {
		throw new UserError("Проверьте даты, количество и товарные позиции.");
	}

	if (hasDuplicatePlanRows(plan))
		throw new UserError(
			"Для одной позиции и даты допустима одна строка плана.",
		);

	validateRowItems(shipment, [...plan, ...actual]);
	validateItemTotals(shipment, plan);
	validateItemTotals(shipment, actual);
	validateMilestones(milestones);

	return {
		revision: shipment.revision,
		priority,
		status_reason: reason.trim() || null,
		plan,
		actual,
		transport_milestones: milestones,
	};
}
