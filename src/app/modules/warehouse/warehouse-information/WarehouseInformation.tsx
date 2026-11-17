import { useRef } from "react";
import { useWarehouseScreen } from "@/ports/warehouse";
import { saveFile } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { ScrollArea } from "@/shared/ui/navigation";
import { buildReport, previousPeriod, warehouseDay } from "./model/report";
import { reportCsv } from "./model/reportCsv";
import { useReportFilters } from "./model/useReportFilters";
import { warehouseFields } from "./model/warehouseFields";
import { CategoryDistribution } from "./ui/CategoryDistribution/CategoryDistribution";
import { StatusDistribution } from "./ui/StatusDistribution/StatusDistribution";
import { StockDistribution } from "./ui/StockDistribution/StockDistribution";
import { TrafficChart } from "./ui/TrafficChart/TrafficChart";
import { ReportFinancialMetrics } from "./ui/ReportFinancialMetrics/ReportFinancialMetrics";
import { ReportMetrics } from "./ui/ReportMetrics/ReportMetrics";
import { ReportFiltersPanel } from "./ui/ReportFiltersPanel/ReportFiltersPanel";
import { ReportOrders } from "./ui/ReportOrders/ReportOrders";
import styles from "./shared.module.css";

export function WarehouseInformation() {
	const { warehouse: w } = useWarehouseScreen(warehouseFields);
	const operations = useRef<HTMLElement>(null);
	const {
		filters,
		period,
		selectedRange,
		orderLimit,
		valid,
		update,
		setPeriod,
		selectRange,
		clearRange,
		loadMoreOrders,
	} = useReportFilters(w);
	const report = buildReport(w, filters);
	const statusReport = buildReport(w, { ...filters, status: "all" });
	const previous =
		valid && filters.compare ? buildReport(w, previousPeriod(filters)) : null;

	function selectTraffic(from: string, to: string) {
		selectRange(from, to);
		requestAnimationFrame(() => {
			operations.current?.focus({ preventScroll: true });
			operations.current?.scrollIntoView({
				block: "start",
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
			});
		});
	}
	const detailOrders = report.orders
		.filter((order) => {
			const day = warehouseDay(order.created, w.timezone);
			return (
				!selectedRange || (day >= selectedRange.from && day <= selectedRange.to)
			);
		})
		.sort((a, b) => b.created.localeCompare(a.created));

	function download() {
		const file = new Blob([reportCsv(w, filters)], {
			type: "text/csv;charset=utf-8",
		});
		const filename = `gridly-${w.id}-${filters.from}-${filters.to}.csv`;

		saveFile(file, filename);
	}

	return (
		<ScrollArea className={styles.pageScroll}>
			<section className={styles.dashboard} data-information-dashboard="">
				<header className={styles.pageHeader}>
					<div>
						<h2>{w.name}</h2>
					</div>
					<div className={styles.headerActions}>
						<Button onClick={download} disabled={!valid}>
							Выгрузить CSV
						</Button>
					</div>
				</header>
				<ReportFiltersPanel
					filters={filters}
					categories={w.categories}
					orders={w.orders}
					period={period}
					setPeriod={setPeriod}
					onChange={update}
				/>
				{!valid ? (
					<ErrorNotice message="Укажите корректный период: начало не позже окончания." />
				) : (
					<>
						<ReportMetrics report={report} previous={previous} />
						<TrafficChart
							key={`${filters.from}:${filters.to}:${filters.kind}:${filters.status}:${filters.category}`}
							report={report}
							previous={previous}
							filters={filters}
							timezone={w.timezone}
							onSelect={selectTraffic}
						/>
						<div className={styles.chartGrid}>
							<StatusDistribution
								report={statusReport}
								status={filters.status}
								onSelect={(status) =>
									update("status", filters.status === status ? "all" : status)
								}
							/>
							<StockDistribution report={report} />
						</div>
						<CategoryDistribution
							warehouse={w}
							category={filters.category}
							onSelect={(category) => update("category", category)}
						/>
						<ReportFinancialMetrics
							report={report}
							previous={previous}
							warehouse={w}
							filters={filters}
						/>
						<ReportOrders
							orders={detailOrders}
							selectedRange={selectedRange}
							sectionRef={operations}
							timezone={w.timezone}
							limit={orderLimit}
							onClearRange={clearRange}
							onLoadMore={loadMoreOrders}
						/>
					</>
				)}
			</section>
		</ScrollArea>
	);
}
