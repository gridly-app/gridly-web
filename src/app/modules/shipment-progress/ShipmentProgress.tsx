import { IconCheck } from "@tabler/icons-react";
import { useId } from "react";
import { formatMoment, type Shipment, stages } from "@/domain/shipment";
import { Badge } from "@/shared/ui/dataDisplay";
import styles from "./ShipmentProgress.module.css";

const steps = Object.keys(stages) as (keyof typeof stages)[];
const inboundStages = {
	...stages,
	warehouse_preparation: "Подготовка у поставщика",
	ready_to_ship: "Готов к отправке",
	delivered: "Принят на складе",
};
const statuses = {
	active: "В исполнении",
	on_hold: "Приостановлена",
	cancelled: "Отменена",
	delivered: "Доставлена",
} as const;

export function ShipmentProgress({
	shipment: { order, milestones },
	kind = "outbound",
	title = "Этапы доставки",
}: {
	shipment: Pick<Shipment, "order" | "milestones">;
	kind?: "inbound" | "outbound";
	title?: string;
}) {
	const heading = useId();
	const byStage = new Map(milestones.map((step) => [step.code, step]));
	const current = steps.findIndex(
		(code) => byStage.get(code)?.state === "current",
	);
	const completed = steps.reduce(
		(last, code, index) =>
			byStage.get(code)?.state === "completed" ? index : last,
		-1,
	);
	const finished = order.state === "delivered";
	const interrupted = order.state === "on_hold" || order.state === "cancelled";
	const reached = finished ? steps.length - 1 : Math.max(current, completed);

	return (
		<section className={styles.panel} aria-labelledby={heading}>
			<header className={styles.heading}>
				<h2 id={heading}>{title}</h2>
				<Badge
					tone={finished ? "success" : interrupted ? "warning" : "neutral"}
				>
					{finished && kind === "inbound" ? "Принята" : statuses[order.state]}
				</Badge>
			</header>
			{interrupted && order.status_reason && <p>{order.status_reason}</p>}
			{reached < 0 && <p>Данные об этапах ещё не поступили.</p>}
			<ol className={styles.steps}>
				{steps.map((code, index) => {
					const milestone = byStage.get(code);
					const isCurrent = index === current && index === reached && !finished;
					const isComplete = index <= reached && !isCurrent;
					const state = isComplete
						? "completed"
						: isCurrent
							? "current"
							: "pending";
					const date = milestone?.occurred_at ?? milestone?.planned_at;
					return (
						<li
							key={code}
							data-state={state}
							data-connected={index < reached}
							aria-current={isCurrent ? "step" : undefined}
						>
							<span className={styles.marker} aria-hidden="true">
								{isComplete && <IconCheck size={14} stroke={3} />}
							</span>
							<strong>
								{(kind === "inbound" ? inboundStages : stages)[code]}
							</strong>
							<small>
								{isComplete
									? "Завершён"
									: isCurrent
										? "Текущий этап"
										: interrupted
											? "Не пройден"
											: "Ожидается"}
							</small>
							{date && (
								<time dateTime={date}>
									{milestone?.occurred_at ? "" : "План · "}
									{formatMoment(date, order.time_zone)}
								</time>
							)}
							{milestone?.note && <small>{milestone.note}</small>}
						</li>
					);
				})}
			</ol>
		</section>
	);
}
