import { formatMoment, type Shipment, stages } from "@/domain/shipment";

const stageOrder = [
	"accepted",
	"warehouse_preparation",
	"ready_to_ship",
	"loading",
	"handed_to_carrier",
	"in_transit",
	"delivered",
] satisfies (keyof typeof stages)[];

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
const orderLabels = {
	active: "В исполнении",
	on_hold: "Приостановлена",
	cancelled: "Отменена",
	delivered: "Доставлена",
};
const orderTones = {
	active: "neutral",
	on_hold: "warning",
	cancelled: "warning",
	delivered: "success",
} as const;

export function shipmentProgress(
	shipment: Pick<Shipment, "order" | "milestones">,
	kind: "inbound" | "outbound",
) {
	const { order, milestones } = shipment;
	const byStage = new Map(
		milestones.map((milestone) => [milestone.code, milestone]),
	);
	const labels = kind === "inbound" ? inboundStages : stages;
	const isInboundDelivered = kind === "inbound" && order.state === "delivered";
	const isInterrupted =
		order.state === "on_hold" || order.state === "cancelled";
	const steps = stageOrder.map((code, index) => {
		const milestone = byStage.get(code);
		const state = milestone?.state ?? "pending";
		const isComplete = state === "completed";
		const nextCode = stageOrder[index + 1];
		const nextState = nextCode ? byStage.get(nextCode)?.state : undefined;
		const isConnected =
			isComplete && (nextState === "completed" || nextState === "current");
		const plannedDate = isComplete ? null : milestone?.planned_at;
		const date = milestone?.occurred_at ?? plannedDate;
		const datePrefix = milestone?.occurred_at ? "" : "План · ";
		const dateLabel = date
			? `${datePrefix}${formatMoment(date, order.time_zone)}`
			: null;

		return {
			code,
			label: labels[code],
			state,
			isComplete,
			isCurrent: state === "current",
			isConnected,
			statusLabel: milestone ? milestoneLabels[state] : "Нет данных об этапе",
			date,
			dateLabel,
			isDateUnknown: isComplete && !date,
			note: milestone?.note,
		};
	});

	return {
		steps,
		tone: orderTones[order.state],
		statusLabel: isInboundDelivered ? "Принята" : orderLabels[order.state],
		reason: isInterrupted ? order.status_reason : null,
		hasMilestones: milestones.length > 0,
	};
}
