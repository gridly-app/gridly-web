import {
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import type { useHistoryPage } from "../model/useHistoryPage";
import styles from "./HistoryTable.module.css";

interface HistoryTableProps {
	events: ReturnType<typeof useHistoryPage>["visibleEvents"];
	hiddenColumns: readonly number[];
	timezone: string;
}

export function HistoryTable({
	events,
	hiddenColumns,
	timezone,
}: HistoryTableProps) {
	const date = (value: string) =>
		Number.isFinite(Date.parse(value))
			? new Date(value).toLocaleDateString("ru-RU", {
					timeZone: timezone,
					day: "numeric",
					month: "short",
					year: "numeric",
				})
			: "Дата не передана";
	const time = (value: string) =>
		Number.isFinite(Date.parse(value))
			? new Date(value).toLocaleTimeString("ru-RU", {
					timeZone: timezone,
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				})
			: "—";
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
									<strong>{event.title}</strong>
									{event.detail && <p>{event.detail}</p>}
									{!hiddenColumns.includes(1) && (
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
									dateTime={
										Number.isFinite(Date.parse(event.time))
											? event.time
											: undefined
									}
								>
									{date(event.time)}
									<small>{time(event.time)}</small>
								</time>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
