import { formatMoment } from "@/shared/lib";
import type { SystemStatus } from "../../api/system.dto";

import { Badge } from "@/shared/ui/dataDisplay";

import { type TableColumns, SortedTable } from "@/shared/ui/management";

import sharedStyles from "../../shared.module.css";

type JobStatus = {
	label: string;
	tone: "success" | "warning" | "danger" | "neutral";
};

const jobStatuses = new Map<string, JobStatus>([
	["running", { label: "Выполняется", tone: "success" }],
	["pending", { label: "Ожидает", tone: "neutral" }],
	["completed", { label: "Завершена", tone: "success" }],
	["failed", { label: "Ошибка", tone: "danger" }],
]);
const unknownStatus = { label: "Нет сведений", tone: "neutral" } as const;

function jobRow(job: SystemStatus["jobs"][number]) {
	return {
		...job,
		label: job.name ?? "Фоновая задача",
		statusInfo: jobStatuses.get(job.status) ?? unknownStatus,
		startedAt: formatMoment(job.started_at),
	};
}

const columns: TableColumns<ReturnType<typeof jobRow>> = [
	{ id: "job", label: "Задача", value: (row) => row.label },
	{
		id: "status",
		label: "Статус",
		value: (row) => row.statusInfo.label,
		cell: (row) => (
			<Badge tone={row.statusInfo.tone}>{row.statusInfo.label}</Badge>
		),
	},
	{
		id: "started",
		label: "Запущена",
		value: (row) =>
			row.started_at === null ? null : Date.parse(row.started_at),
		cell: (row) => row.startedAt,
	},
];

export function SystemJobs({
	jobs,
	matches,
}: {
	jobs: SystemStatus["jobs"];
	matches: (values: string[]) => boolean;
}) {
	const allRows = jobs.map(jobRow);
	const rows = allRows.filter(({ label, statusInfo, startedAt }) =>
		matches([label, statusInfo.label, startedAt]),
	);

	return (
		<section className={sharedStyles.group}>
			<h2 className={sharedStyles.groupTitle}>Фоновые задачи</h2>
			{jobs.length ? (
				<SortedTable
					label="Фоновые задачи"
					rowKey={(row) => row.id}
					rows={rows}
					columns={columns}
				/>
			) : (
				<p>Текущих фоновых задач нет.</p>
			)}
		</section>
	);
}
