import { useId } from "react";
import { statusLabels, type Warehouse } from "@/entities/warehouse";
import { Checkbox } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Field, Label, Select } from "@/shared/ui/forms";
import { SegmentedControl } from "@/shared/ui/navigation";
import type { ReportFilters } from "../model/report";
import styles from "./ReportFiltersPanel.module.css";

interface ReportFiltersPanelProps {
	filters: ReportFilters;
	categories: Warehouse["categories"];
	orders: Warehouse["orders"];
	period: string;
	setPeriod: (days: number | "all") => void;
	onChange: <K extends keyof ReportFilters>(
		key: K,
		value: ReportFilters[K],
	) => void;
}

export function ReportFiltersPanel({
	filters,
	categories,
	orders,
	period,
	setPeriod,
	onChange,
}: ReportFiltersPanelProps) {
	const compareId = useId();

	return (
		<section className={styles.filterPanel} aria-label="Фильтры аналитики">
			<div className={styles.filterMain}>
				<SegmentedControl
					aria-label="Быстрый выбор периода"
					value={period}
					onValueChange={(value) =>
						setPeriod(value === "all" ? "all" : Number(value))
					}
					items={[
						{ value: "7", label: "7 дней" },
						{ value: "30", label: "30 дней" },
						{ value: "90", label: "90 дней" },
						{ value: "all", label: "Весь период" },
					]}
				/>
				<SegmentedControl
					aria-label="Направление отчёта"
					value={filters.kind}
					onValueChange={(kind) => onChange("kind", kind)}
					items={[
						{ value: "all", label: "Все" },
						{ value: "inbound", label: "Поставки" },
						{ value: "outbound", label: "Отгрузки" },
					]}
				/>
				<Select
					aria-label="Категория отчёта"
					value={filters.category}
					onValueChange={(value) => onChange("category", value)}
					options={[
						{ value: "all", label: "Все категории" },
						...categories.map((category) => ({
							value: category.id,
							label: category.name,
						})),
					]}
				/>
			</div>
			<details className={styles.advancedFilters}>
				<summary>
					Период и дополнительные фильтры{" "}
					<Badge tone="neutral">
						{filters.from || "С"} — {filters.to || "По"}
					</Badge>
				</summary>
				<div className={styles.filters}>
					<DateRangeFields
						from={filters.from}
						to={filters.to}
						onFromChange={(value) => onChange("from", value)}
						onToChange={(value) => onChange("to", value)}
					/>
					<Field label="Статус">
						<Select
							aria-label="Статус операций"
							value={filters.status}
							onValueChange={(value) => onChange("status", value)}
							options={[
								{ value: "all", label: "Все статусы" },
								...Array.from(new Set(orders.map((order) => order.status))).map(
									(status) => ({
										value: status,
										label: statusLabels[status] ?? status,
									}),
								),
							]}
						/>
					</Field>
					<Label htmlFor={compareId} className={styles.compare}>
						<Checkbox
							id={compareId}
							checked={filters.compare}
							onCheckedChange={(value) => onChange("compare", value)}
						/>
						Сравнить с предыдущим периодом
					</Label>
				</div>
			</details>
		</section>
	);
}
