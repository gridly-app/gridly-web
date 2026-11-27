import { useRef } from "react";

import { useWarehouseScreen } from "@/ports/warehouse";
import { saveFile } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";

import { buildReport } from "./model/report";
import { reportCsv } from "./model/reportCsv";
import {
	previousPeriod,
	type ReportRange,
	warehouseDay,
} from "./model/reportPeriod";
import { useReportFilters } from "./model/useReportFilters";
import { warehouseResources } from "./model/warehouseResources";
import { CategoryDistribution } from "./ui/CategoryDistribution/CategoryDistribution";
import { ReportFiltersPanel } from "./ui/ReportFiltersPanel/ReportFiltersPanel";
import { ReportFinancialMetrics } from "./ui/ReportFinancialMetrics/ReportFinancialMetrics";
import { ReportMetrics } from "./ui/ReportMetrics/ReportMetrics";
import { ReportOrders } from "./ui/ReportOrders/ReportOrders";
import { StatusDistribution } from "./ui/StatusDistribution/StatusDistribution";
import { StockDistribution } from "./ui/StockDistribution/StockDistribution";
import { TrafficChart } from "./ui/TrafficChart/TrafficChart";

import styles from "./shared.module.css";

function isInRange(day: string, range: ReportRange | null) {
	return !range || (day >= range.from && day <= range.to);
}

function scrollBehavior(): ScrollBehavior {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "auto"
		: "smooth";
}

export function WarehouseInformation() {
	const { warehouse } = useWarehouseScreen(warehouseResources);
	const operations = useRef<HTMLElement>(null);
	const {
		filters,
		period,
		selectedRange,
		orderLimit,
		isValid,
		update,
		setPeriod,
		selectRange,
		clearRange,
		loadMoreOrders,
	} = useReportFilters(warehouse);
	const report = buildReport(warehouse, filters);
	const statusReport = buildReport(warehouse, { ...filters, status: "all" });
	const previous =
		isValid && filters.compare
			? buildReport(warehouse, previousPeriod(filters))
			: null;
	const detailOrders = report.orders
		.filter((order) =>
			isInRange(warehouseDay(order.created, warehouse.timezone), selectedRange),
		)
		.sort((a, b) => b.created.localeCompare(a.created));
	const chartKey = [
		filters.from,
		filters.to,
		filters.kind,
		filters.status,
		filters.category,
	].join(":");

	function handleTrafficSelect(from: string, to: string) {
		selectRange(from, to);
		requestAnimationFrame(() => {
			operations.current?.focus({ preventScroll: true });
			operations.current?.scrollIntoView({
				block: "start",
				behavior: scrollBehavior(),
			});
		});
	}

	function handleStatusSelect(status: string) {
		update("status", filters.status === status ? "all" : status);
	}

	function handleCategorySelect(category: string) {
		update("category", category);
	}

	function handleDownload() {
		const file = new Blob([reportCsv(warehouse, filters)], {
			type: "text/csv;charset=utf-8",
		});

		saveFile(file, `gridly-${warehouse.id}-${filters.from}-${filters.to}.csv`);
	}

	return (
		<ScrollArea className={styles.pageScroll}>
			<section className={styles.dashboard} data-information-dashboard="">
				<header className={styles.pageHeader}>
					<h2>{warehouse.name}</h2>
					<div className={styles.headerActions}>
						<Button onClick={handleDownload} disabled={!isValid}>
							Выгрузить CSV
						</Button>
					</div>
				</header>
				<ReportFiltersPanel
					filters={filters}
					categories={warehouse.categories}
					orders={warehouse.orders}
					period={period}
					onPeriodChange={setPeriod}
					onChange={update}
				/>
				{isValid ? (
					<>
						<ReportMetrics report={report} previous={previous} />
						<TrafficChart
							key={chartKey}
							report={report}
							previous={previous}
							filters={filters}
							timezone={warehouse.timezone}
							onSelect={handleTrafficSelect}
						/>
						<div className={styles.chartGrid}>
							<StatusDistribution
								report={statusReport}
								status={filters.status}
								onSelect={handleStatusSelect}
							/>
							<StockDistribution report={report} />
						</div>
						<CategoryDistribution
							warehouse={warehouse}
							category={filters.category}
							onSelect={handleCategorySelect}
						/>
						<ReportFinancialMetrics
							report={report}
							previous={previous}
							warehouse={warehouse}
							filters={filters}
						/>
						<ReportOrders
							orders={detailOrders}
							selectedRange={selectedRange}
							sectionRef={operations}
							timezone={warehouse.timezone}
							limit={orderLimit}
							onClearRange={clearRange}
							onLoadMore={loadMoreOrders}
						/>
					</>
				) : (
					<ErrorNotice message="Укажите корректный период: начало не позже окончания." />
				)}
			</section>
		</ScrollArea>
	);
}
