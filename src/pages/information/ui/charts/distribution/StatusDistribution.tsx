import { statusLabels } from "@/entities/warehouse";
import { Badge } from "@/shared/ui/dataDisplay";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";
import type { WarehouseReport } from "../../../model/chartData";
import chartStyles from "../ReportChart.module.css";
import { Donut } from "./Donut";

const statusColor = (status: string) =>
	["received", "shipped", "completed"].includes(status)
		? "var(--primary)"
		: ["cancelled", "canceled", "draft", "created"].includes(status)
			? "var(--neutral)"
			: ["blocked", "received_with_losses", "failed"].includes(status)
				? "var(--error)"
				: status.includes("waiting") || status.includes("awaiting")
					? "var(--warning)"
					: "var(--info)";
export function StatusDistribution({
	report,
	status,
	onSelect,
}: {
	report: WarehouseReport;
	status: string;
	onSelect: (status: string) => void;
}) {
	const counts = new Map<string, number>();
	for (const order of report.orders)
		counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
	const slices = [...counts].map(([key, value]) => ({
		key,
		value,
		label: statusLabels[key] ?? key,
		color: statusColor(key),
	}));
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
					onSelect={onSelect}
					title="Количество заказов по статусам"
					center={selected?.value ?? report.orders.length}
					caption={selected ? "выбрано" : "всего заказов"}
				/>
			) : (
				<Empty>
					<EmptyDescription>Нет заказов за выбранный период.</EmptyDescription>
				</Empty>
			)}
		</section>
	);
}
