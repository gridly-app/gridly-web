import { type ComponentProps, useId } from "react";

import type { ShipmentProgressSlot } from "@/ports/shipment";
import { Badge } from "@/shared/ui/dataDisplay";

import { shipmentStatus } from "./model/shipmentStatus";
import { shipmentSteps } from "./model/shipmentSteps";
import { ShipmentTimeline } from "./ui/ShipmentTimeline/ShipmentTimeline";

import styles from "./ShipmentProgress.module.css";

export function ShipmentProgress({
	shipment,
	kind = "outbound",
	title = "Этапы доставки",
}: ComponentProps<ShipmentProgressSlot>) {
	const headingId = useId();
	const { order, milestones } = shipment;
	const { label, tone, reason } = shipmentStatus(order, kind);
	const steps = shipmentSteps(milestones, kind, order.time_zone);
	const hasMilestones = milestones.length > 0;

	return (
		<section className={styles.panel} aria-labelledby={headingId}>
			<header className={styles.heading}>
				<h2 id={headingId}>{title}</h2>
				<Badge tone={tone}>{label}</Badge>
			</header>
			{reason && <p>{reason}</p>}
			{!hasMilestones && <p>Данные об этапах ещё не поступили.</p>}
			<ShipmentTimeline steps={steps} />
		</section>
	);
}
