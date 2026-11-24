import { IconCheck } from "@tabler/icons-react";
import { useId } from "react";
import type { Shipment } from "@/domain/shipment";
import { Badge } from "@/shared/ui/dataDisplay";
import { shipmentProgress } from "./model/shipmentProgress";

import styles from "./ShipmentProgress.module.css";

export function ShipmentProgress({
	shipment,
	kind = "outbound",
	title = "Этапы доставки",
}: {
	shipment: Pick<Shipment, "order" | "milestones">;
	kind?: "inbound" | "outbound";
	title?: string;
}) {
	const headingId = useId();
	const model = shipmentProgress(shipment, kind);

	return (
		<section className={styles.panel} aria-labelledby={headingId}>
			<header className={styles.heading}>
				<h2 id={headingId}>{title}</h2>
				<Badge tone={model.tone}>{model.statusLabel}</Badge>
			</header>
			{model.reason && <p>{model.reason}</p>}
			{!model.hasMilestones && <p>Данные об этапах ещё не поступили.</p>}
			<ol className={styles.steps}>
				{model.steps.map((step) => (
					<ShipmentStep key={step.code} step={step} />
				))}
			</ol>
		</section>
	);
}

function ShipmentStep({
	step,
}: {
	step: ReturnType<typeof shipmentProgress>["steps"][number];
}) {
	const ariaCurrent = step.isCurrent ? "step" : undefined;

	return (
		<li
			data-state={step.state}
			data-connected={step.isConnected}
			aria-current={ariaCurrent}
		>
			<span className={styles.marker} aria-hidden="true">
				{step.isComplete && <IconCheck size={14} stroke={3} />}
			</span>
			<strong>{step.label}</strong>
			<small>{step.statusLabel}</small>
			{step.isDateUnknown && <small>Дата неизвестна</small>}
			{step.date && <time dateTime={step.date}>{step.dateLabel}</time>}
			{step.note && <small>{step.note}</small>}
		</li>
	);
}
