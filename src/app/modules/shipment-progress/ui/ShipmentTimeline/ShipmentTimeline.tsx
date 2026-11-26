import { IconCheck } from "@tabler/icons-react";

import type { shipmentSteps } from "../../model/shipmentSteps";

import styles from "./ShipmentTimeline.module.css";

export function ShipmentTimeline({
	steps,
}: {
	steps: ReturnType<typeof shipmentSteps>;
}) {
	return (
		<ol className={styles.steps}>
			{steps.map((step) => {
				const ariaCurrent = step.state === "current" ? "step" : undefined;
				const isComplete = step.state === "completed";

				return (
					<li
						key={step.code}
						data-state={step.state}
						data-connected={step.isConnected}
						aria-current={ariaCurrent}
					>
						<span className={styles.marker} aria-hidden="true">
							{isComplete && <IconCheck size={14} stroke={3} />}
						</span>
						<strong>{step.label}</strong>
						<small>{step.statusLabel}</small>
						{step.isDateUnknown && <small>Дата неизвестна</small>}
						{step.date && (
							<time dateTime={step.date.value}>{step.date.label}</time>
						)}
						{step.note && <small>{step.note}</small>}
					</li>
				);
			})}
		</ol>
	);
}
