import {
	IconActivity,
	IconAlertTriangle,
	IconClock,
} from "@tabler/icons-react";

import { formatMoment } from "@/shared/lib";
import type { SystemStatus } from "../../api/system.dto";

import { Card } from "@/shared/ui/dataDisplay";

import { managementStyles as styles } from "@/shared/ui/management";
import metricStyles from "./SystemMetrics.module.css";

export function SystemMetrics({
	data,
}: {
	data: Pick<
		SystemStatus,
		"components" | "jobs" | "error_count" | "checked_at"
	>;
}) {
	const available = data.components.filter(
		(component) => component.status === "ok",
	).length;
	const activeJobs = data.jobs.filter(
		(job) => job.status === "running" || job.status === "pending",
	).length;

	const checkedAt = formatMoment(data.checked_at);

	return (
		<>
			<div className={metricStyles.metrics}>
				<Card className={metricStyles.metric}>
					<span className={styles.actions}>
						<IconActivity size={18} aria-hidden="true" /> Источники в норме
					</span>
					<strong className={metricStyles.value}>
						{available} / {data.components.length}
					</strong>
				</Card>
				<Card className={metricStyles.metric}>
					<span className={styles.actions}>
						<IconAlertTriangle size={18} aria-hidden="true" /> Ошибки за период
					</span>
					<strong className={metricStyles.value}>{data.error_count}</strong>
				</Card>
				<Card className={metricStyles.metric}>
					<span className={styles.actions}>
						<IconClock size={18} aria-hidden="true" /> Активные задачи
					</span>
					<strong className={metricStyles.value}>{activeJobs}</strong>
				</Card>
			</div>
			<span className={styles.subtle}>Последняя проверка · {checkedAt}</span>
		</>
	);
}
