import { statusLabels } from "@/domain/warehouse";
import { Badge } from "@/shared/ui/dataDisplay";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";

import type { WarehouseReport } from "../../model/report";
import { Donut } from "../Donut/Donut";

import chartStyles from "../../shared.module.css";

const statusColors = [
	{
		color: "var(--primary)",
		matches: (status: string) =>
			["received", "shipped", "completed"].includes(status),
	},
	{
		color: "var(--neutral)",
		matches: (status: string) =>
			["cancelled", "canceled", "draft", "created"].includes(status),
	},
	{
		color: "var(--error)",
		matches: (status: string) =>
			["blocked", "received_with_losses", "failed"].includes(status),
	},
	{
		color: "var(--warning)",
		matches: (status: string) =>
			status.includes("waiting") || status.includes("awaiting"),
	},
];

function statusColor(status: string) {
	return (
		statusColors.find(({ matches }) => matches(status))?.color ?? "var(--info)"
	);
}

function statusSlices(orders: WarehouseReport["orders"]) {
	const counts = new Map<string, number>();

	for (const order of orders) {
		counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
	}

	return [...counts].map(([key, value]) => ({
		key,
		value,
		label: statusLabels[key] ?? key,
		color: statusColor(key),
	}));
}

export function StatusDistribution({
	report,
	status,
	onSelect,
}: {
	report: WarehouseReport;
	status: string;
	onSelect: (status: string) => void;
}) {
	const slices = statusSlices(report.orders);
	const selected = slices.find((slice) => slice.key === status);

	return (
		<section
			className={chartStyles.chartCard}
			aria-label="Распределение статусов заказов"
		>
			<div className={chartStyles.chartHeading}>
				<div>
					<h3>Статусы заказов</h3>
					<p>Нажмите на сегмент или статус, чтобы отфильтровать отчёт.</p>
				</div>
				<Badge tone="neutral">{report.orders.length} заказов</Badge>
			</div>
			{slices.length ? (
				<Donut
					slices={slices}
					selected={status}
					title="Количество заказов по статусам"
					total={selected?.value ?? report.orders.length}
					caption={selected ? "выбрано" : "всего заказов"}
					onSelect={onSelect}
				/>
			) : (
				<Empty>
					<EmptyDescription>Нет заказов за выбранный период.</EmptyDescription>
				</Empty>
			)}
		</section>
	);
}
