import { useId } from "react";

import { statusLabels, type WarehouseView } from "@/domain/warehouse";
import { Checkbox } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { DateRangeFields, Field, Label, Select } from "@/shared/ui/forms";
import { SegmentedControl } from "@/shared/ui/navigation";

import type { ReportFilters } from "../../model/reportPeriod";
import type { ReportPeriod } from "../../model/useReportFilters";

import styles from "./ReportFiltersPanel.module.css";

const periodItems = [
	{ value: "7", label: "7 дней" },
	{ value: "30", label: "30 дней" },
	{ value: "90", label: "90 дней" },
	{ value: "all", label: "Весь период" },
];
const kindItems = [
	{ value: "all", label: "Все" },
	{ value: "inbound", label: "Поставки" },
	{ value: "outbound", label: "Отгрузки" },
];

export function ReportFiltersPanel({
	filters,
	categories,
	orders,
	period,
	onPeriodChange,
	onChange,
}: {
	filters: ReportFilters;
	categories: WarehouseView<"catalog">["categories"];
	orders: WarehouseView<"orders">["orders"];
	period: string;
	onPeriodChange: (days: ReportPeriod) => void;
	onChange: <K extends keyof ReportFilters>(
		key: K,
		value: ReportFilters[K],
	) => void;
}) {
	const compareId = useId();
	const categoryOptions = [
		{ value: "all", label: "Все категории" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		...[...new Set(orders.map((order) => order.status))].map((status) => ({
			value: status,
			label: statusLabels[status] ?? status,
		})),
	];

	function handlePeriodChange(value: string) {
		onPeriodChange(value === "all" ? "all" : Number(value));
	}

	function handleKindChange(kind: string) {
		onChange("kind", kind);
	}

	function handleCategoryChange(category: string) {
		onChange("category", category);
	}

	function handleFromChange(from: string) {
		onChange("from", from);
	}

	function handleToChange(to: string) {
		onChange("to", to);
	}

	function handleStatusChange(status: string) {
		onChange("status", status);
	}

	function handleCompareChange(compare: boolean) {
		onChange("compare", compare);
	}

	return (
		<section className={styles.filterPanel} aria-label="Фильтры аналитики">
			<div className={styles.filterMain}>
				<SegmentedControl
					aria-label="Быстрый выбор периода"
					value={period}
					onValueChange={handlePeriodChange}
					items={periodItems}
				/>
				<SegmentedControl
					aria-label="Направление отчёта"
					value={filters.kind}
					onValueChange={handleKindChange}
					items={kindItems}
				/>
				<Select
					aria-label="Категория отчёта"
					value={filters.category}
					onValueChange={handleCategoryChange}
					options={categoryOptions}
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
						onFromChange={handleFromChange}
						onToChange={handleToChange}
					/>
					<Field label="Статус">
						<Select
							aria-label="Статус операций"
							value={filters.status}
							onValueChange={handleStatusChange}
							options={statusOptions}
						/>
					</Field>
					<Label htmlFor={compareId} className={styles.compare}>
						<Checkbox
							id={compareId}
							checked={filters.compare}
							onCheckedChange={handleCompareChange}
						/>
						Сравнить с предыдущим периодом
					</Label>
				</div>
			</details>
		</section>
	);
}
