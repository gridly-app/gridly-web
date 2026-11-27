import { formatMoment } from "@/shared/lib";
import { Badge } from "@/shared/ui/dataDisplay";
import { SortedTable, type TableColumns } from "@/shared/ui/management";

import type { SystemStatus } from "../../api/system.dto";
import { componentName } from "../../model/systemLabels";

import sharedStyles from "../../shared.module.css";

const statuses = {
	ok: { label: "Доступен", tone: "success" },
	degraded: { label: "Работает с ошибками", tone: "warning" },
	unavailable: { label: "Недоступен", tone: "danger" },
} as const;

function componentRow(source: SystemStatus["components"][number]) {
	return {
		...source,
		label: source.name ?? componentName(source.code),
		statusInfo: statuses[source.status],
		lastUpdated: formatMoment(source.last_success_at),
		lag: source.lag_seconds === null ? "Нет данных" : `${source.lag_seconds} с`,
	};
}

const columns: TableColumns<ReturnType<typeof componentRow>> = [
	{ id: "component", label: "Компонент", value: (row) => row.label },
	{
		id: "status",
		label: "Доступность",
		value: (row) => row.statusInfo.label,
		cell: (row) => (
			<Badge tone={row.statusInfo.tone}>{row.statusInfo.label}</Badge>
		),
	},
	{
		id: "updated",
		label: "Последнее обновление",
		value: (row) =>
			row.last_success_at === null ? null : Date.parse(row.last_success_at),
		cell: (row) => row.lastUpdated,
	},
	{
		id: "lag",
		label: "Задержка",
		value: (row) => row.lag_seconds,
		cell: (row) => row.lag,
	},
];

export function SystemComponents({
	components,
	matches,
}: {
	components: SystemStatus["components"];
	matches: (values: string[]) => boolean;
}) {
	const allRows = components.map(componentRow);
	const rows = allRows.filter(({ label, statusInfo, lastUpdated, lag }) =>
		matches([label, statusInfo.label, lastUpdated, lag]),
	);

	return (
		<section className={sharedStyles.group}>
			<h2 className={sharedStyles.groupTitle}>Источники данных</h2>
			<SortedTable
				label="Источники данных"
				rowKey={(row) => row.code}
				rows={rows}
				columns={columns}
			/>
		</section>
	);
}
