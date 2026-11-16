import { useState } from "react";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import type { FetchHttpClient } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { RetryButton, Skeleton } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import {
	adminMoment,
	auditArea,
	auditAreaLabels,
	auditSummary,
} from "../model/auditPresentation";
import type { AuditEvent, SystemError } from "../model/shipmentAudit";
import { useAuditEvents } from "../model/useAuditEvents";
import { SortedAdminTable } from "./AdminTable";
import { AuditEvents } from "./AuditPanel";

const areaPages: Partial<Record<keyof typeof auditAreaLabels, string>> = {
	inbound: "inbound",
	outbound: "outbound",
	map: "map",
};

export function RecentErrors({
	http,
	auditPath,
	items,
	orderEvents,
	matches,
	componentName,
}: {
	http: FetchHttpClient;
	auditPath: string;
	items: SystemError[];
	orderEvents?: AuditEvent[] | undefined;
	matches: (values: string[]) => boolean;
	componentName: (code: string) => string;
}) {
	const [selected, setSelected] = useState<string | null>(null);
	const mode = useWorkspaceMode();
	const audit = useAuditEvents(http, auditPath, items.length > 0);
	const byOperation = new Map<string, AuditEvent[]>();
	for (const event of new Map(
		[...(audit.error ? [] : (audit.data ?? [])), ...(orderEvents ?? [])].map(
			(event) => [event.id, event],
		),
	).values()) {
		if (!event.correlation_id) continue;
		const related = byOperation.get(event.correlation_id) ?? [];
		related.push(event);
		byOperation.set(event.correlation_id, related);
	}

	const rows = items.map((error, index) => {
		const events = byOperation.get(error.correlation_id) ?? [];
		const failure = events.find(
			(entry) =>
				entry.result === "failure" && entry.occurred_at === error.occurred_at,
		);
		const event =
			failure ??
			events.find((entry) => entry.result === "failure") ??
			events[0];
		const area = event && auditArea(event);
		const page = area && areaPages[area];
		return {
			...error,
			key: JSON.stringify([
				error.correlation_id,
				error.occurred_at,
				error.component,
				index,
			]),
			componentLabel: error.component_name ?? componentName(error.component),
			events,
			context: event &&
				area && { ...auditSummary(event), area: auditAreaLabels[area] },
			sectionUrl:
				page && event?.warehouse_id
					? warehousePath(mode, event.warehouse_id, page)
					: undefined,
		};
	});

	const selectedRow = rows.find((row) => row.key === selected);
	return (
		<section className={styles.group}>
			<h2>Последние ошибки</h2>
			{items.length ? (
				<>
					{audit.error && (
						<p>
							Не удалось загрузить связанные события.{" "}
							<RetryButton onRetry={audit.refetch} />
						</p>
					)}
					<SortedAdminTable
						label="Последние ошибки"
						descending
						rowKey={(row) => row.key}
						rows={rows.filter((row) =>
							matches([
								row.componentLabel,
								row.message,
								row.correlation_id,
								row.retry_state ?? "",
								adminMoment(row.occurred_at),
								...row.events.flatMap((event) => [
									auditAreaLabels[auditArea(event)],
									...Object.values(auditSummary(event)),
								]),
							]),
						)}
						columns={[
							{
								label: "Дата и время",
								value: (row) => row.occurred_at,
								cell: (row) => adminMoment(row.occurred_at),
							},
							{
								label: "Ошибка",
								value: (row) => row.message,
								cell: (row) => (
									<>
										{row.message}
										<small className={styles.subtle}>
											{row.componentLabel}
										</small>
									</>
								),
							},
							{
								label: "Что произошло",
								cell: (row) =>
									row.context ? (
										<div className={styles.errorContext}>
											<strong>
												{row.context.area} · {row.context.event}
											</strong>
											<span>
												{[
													row.context.actor,
													row.context.warehouse,
													row.context.order,
												]
													.filter(Boolean)
													.join(" · ")}
											</span>
										</div>
									) : audit.isFetching ? (
										<Skeleton label="Ищем событие…" />
									) : (
										"Контекст операции недоступен"
									),
							},
							{ label: "Повтор", value: (row) => row.retry_state ?? "—" },
							{
								label: "Подробности",
								cell: (row) => (
									<Button
										size="sm"
										variant="secondary"
										onClick={() => setSelected(row.key)}
									>
										{row.events.length
											? "Связанные события"
											: "Подробности ошибки"}
									</Button>
								),
							},
						]}
					/>
				</>
			) : (
				<p>Ошибок в списке нет.</p>
			)}
			{selectedRow && (
				<Modal
					title="Подробности ошибки"
					onClose={() => setSelected(null)}
					wide
				>
					<p>{selectedRow.message}</p>
					{selectedRow.sectionUrl && selectedRow.context && (
						<Link to={selectedRow.sectionUrl}>
							Открыть раздел «{selectedRow.context.area}»
						</Link>
					)}
					{selectedRow.events.length ? (
						<AuditEvents
							items={selectedRow.events}
							search=""
							label="Связанные события"
						/>
					) : audit.isFetching ? (
						<Skeleton label="Ищем связанные события…" />
					) : (
						<p>Связанные события недоступны.</p>
					)}
					<details className={styles.details}>
						<summary>Технические данные</summary>
						<p>
							ID операции · <code>{selectedRow.correlation_id}</code>
						</p>
					</details>
				</Modal>
			)}
		</section>
	);
}
