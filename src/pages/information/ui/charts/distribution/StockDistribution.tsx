import { useState } from "react";
import { Badge } from "@/shared/ui/dataDisplay";
import type { WarehouseReport } from "../../../model/chartData";
import chartStyles from "../ReportChart.module.css";
import { Donut } from "./Donut";

export function StockDistribution({ report }: { report: WarehouseReport }) {
	const [selected, setSelected] = useState("all");
	const slices = [
		{
			key: "available",
			label: "Доступно",
			value: Math.max(0, report.stockQuantity - report.reserved),
			color: "var(--primary)",
		},
		{
			key: "reserved",
			label: "В резерве",
			value: report.reserved,
			color: "var(--warning)",
		},
	];
	const active = slices.find((slice) => slice.key === selected);
	return (
		<section
			className={chartStyles.chartCard}
			aria-label="Доступные и зарезервированные остатки"
		>
			<div className={chartStyles.chartHeading}>
				<div>
					<h3>Текущие остатки</h3>
					<p>
						Текущий снимок склада. Фильтр периода к остаткам не применяется.
					</p>
				</div>
				<Badge tone="success">{report.stockQuantity} шт.</Badge>
			</div>
			<Donut
				slices={slices}
				selected={selected}
				onSelect={(key) => setSelected(selected === key ? "all" : key)}
				title="Доступные и зарезервированные товары"
				center={active?.value ?? report.stockQuantity}
				caption={active?.label ?? "единиц товара"}
			/>
			{!report.stockQuantity && (
				<p className={chartStyles.chartNote}>
					На складе пока нет остатков в выбранной категории.
				</p>
			)}
		</section>
	);
}
