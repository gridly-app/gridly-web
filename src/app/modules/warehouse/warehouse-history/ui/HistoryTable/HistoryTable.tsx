import {
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";

import type { HistoryEvent } from "../../model/useHistoryPage";

import styles from "./HistoryTable.module.css";

const categoryColumnIndex = 1;

function isValidTime(value: string) {
	return Number.isFinite(Date.parse(value));
}

export function HistoryTable({
	events,
	hiddenColumns,
	timezone,
}: {
	events: HistoryEvent[];
	hiddenColumns: readonly number[];
	timezone: string;
}) {
	const isCategoryVisible = !hiddenColumns.includes(categoryColumnIndex);

	function formatDate(value: string) {
		if (!isValidTime(value)) return "Дата не передана";

		return new Date(value).toLocaleDateString("ru-RU", {
			timeZone: timezone,
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	}

	function formatTime(value: string) {
		if (!isValidTime(value)) return "—";

		return new Date(value).toLocaleTimeString("ru-RU", {
			timeZone: timezone,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	}

	return (
		<div className={styles.log} data-history-log="">
			<Table hiddenColumns={hiddenColumns}>
				<TableHeader>
					<TableRow>
						<TableHead>Событие</TableHead>
						<TableHead className={styles.category}>Раздел</TableHead>
						<TableHead className={styles.when}>Когда</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{events.map((event) => (
						<TableRow key={event.id}>
							<TableCell>
								<div className={styles.event}>
									<strong className={styles.title}>{event.title}</strong>
									{event.detail && (
										<p className={styles.detail}>{event.detail}</p>
									)}
									{isCategoryVisible && (
										<span className={styles.mobileBadge}>
											<Badge tone="neutral">{event.groupLabel}</Badge>
										</span>
									)}
								</div>
							</TableCell>
							<TableCell className={styles.category}>
								<Badge tone="neutral">{event.groupLabel}</Badge>
							</TableCell>
							<TableCell className={styles.when}>
								<time
									className={styles.time}
									dateTime={isValidTime(event.time) ? event.time : undefined}
								>
									{formatDate(event.time)}
									<small className={styles.clock}>
										{formatTime(event.time)}
									</small>
								</time>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
