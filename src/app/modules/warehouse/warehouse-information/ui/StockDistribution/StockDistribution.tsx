import { useState } from "react";

import { Badge } from "@/shared/ui/dataDisplay";

import type { WarehouseReport } from "../../model/report";
import { Donut } from "../Donut/Donut";

import chartStyles from "../../shared.module.css";

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

	function handleSelect(key: string) {
		setSelected(selected === key ? "all" : key);
	}

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
				title="Доступные и зарезервированные товары"
				total={active?.value ?? report.stockQuantity}
				caption={active?.label ?? "единиц товара"}
				onSelect={handleSelect}
			/>
			{!report.stockQuantity && (
				<p className={chartStyles.chartNote}>
					На складе пока нет остатков в выбранной категории.
				</p>
			)}
		</section>
	);
}
