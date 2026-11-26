import { type Milestone, stages } from "@/domain/shipment";
import type { Order } from "@/domain/warehouse";
import { formatMoment } from "@/shared/lib";

const stageOrder = [
	"accepted",
	"warehouse_preparation",
	"ready_to_ship",
	"loading",
	"handed_to_carrier",
	"in_transit",
	"delivered",
] as const satisfies readonly Milestone["code"][];

const inboundStages = {
	...stages,
	warehouse_preparation: "Подготовка у поставщика",
	ready_to_ship: "Готов к отправке",
	delivered: "Принят на складе",
};
const milestoneLabels = {
	completed: "Завершён",
	current: "Текущий этап",
	pending: "Ожидается",
};

function milestoneDate(milestone: Milestone | undefined, timeZone: string) {
	const actual = milestone?.occurred_at;
	const planned =
		milestone?.state === "completed" ? null : milestone?.planned_at;
	const value = actual ?? planned;

	if (!value) return null;

	const formatted = formatMoment(value, timeZone);
	const label = actual ? formatted : `План · ${formatted}`;

	return { value, label };
}

export function shipmentSteps(
	milestones: readonly Milestone[],
	kind: Order["kind"],
	timeZone: string,
) {
	const byStage = new Map(
		milestones.map((milestone) => [milestone.code, milestone]),
	);
	const labels = kind === "inbound" ? inboundStages : stages;

	return stageOrder.map((code, index) => {
		const milestone = byStage.get(code);
		const state = milestone?.state ?? "pending";
		const isComplete = state === "completed";
		const nextCode = stageOrder[index + 1];
		const nextState = nextCode ? byStage.get(nextCode)?.state : undefined;
		const isConnected =
			isComplete && (nextState === "completed" || nextState === "current");
		const date = milestoneDate(milestone, timeZone);

		return {
			code,
			label: labels[code],
			state,
			isConnected,
			statusLabel: milestone ? milestoneLabels[state] : "Нет данных об этапе",
			date,
			isDateUnknown: isComplete && !date,
			note: milestone?.note ?? null,
		};
	});
}
