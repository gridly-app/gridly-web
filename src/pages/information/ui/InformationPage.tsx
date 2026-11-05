import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	productPrice,
	StatusBadge,
	statusLabels,
	useWarehouseScope,
} from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	Badge,
	Button,
	Card,
	CardPanel,
	Checkbox,
	Empty,
	EmptyDescription,
	ErrorNotice,
	Field,
	Input,
	Label,
	ScrollArea,
	SegmentedControl,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	useTableColumns,
} from "@/shared/ui";
import { shortDay } from "../model/chartData";
import {
	buildReport,
	previousPeriod,
	type ReportFilters,
	reportCsv,
	shiftDay,
	type UnpricedSection,
	warehouseDay,
} from "../model/report";
import {
	CategoryDistribution,
	StatusDistribution,
	StockDistribution,
} from "./DistributionCharts";
import styles from "./InformationPage.module.css";
import { ReportMetrics } from "./ReportMetrics";
import { TrafficChart } from "./TrafficChart";

const money = (value: number) =>
	value.toLocaleString("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 2,
	});
const estimate = (value: number, known: number, unknown: number) =>
	known === 0 && unknown > 0 ? "Нет цены" : money(value);
export function InformationPage() {
	const { warehouse: w } = useWarehouseScope();
	const compareId = useId();
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const operations = useRef<HTMLElement>(null);
	const columns = useTableColumns("report-orders", [
		"Направление",
		"Контрагент",
		"Количество",
		"Статус",
		"Дата",
	]);
	const [filters, setFilters] = useState<ReportFilters>(() => {
		const to = warehouseDay(Date.now(), w.timezone);
		return {
			from: shiftDay(to, -29),
			to,
			kind: "all",
			status: "all",
			category: "all",
			compare: false,
		};
	});
	const [period, setPeriodSelection] = useState("30");
	const [selectedRange, setSelectedRange] = useState<{
		from: string;
		to: string;
	} | null>(null);
	const [orderLimit, setOrderLimit] = useState(8);
	const valid =
		Number.isFinite(Date.parse(filters.from)) &&
		Number.isFinite(Date.parse(filters.to)) &&
		filters.from <= filters.to;
	const report = buildReport(w, filters);
	const statusReport = buildReport(w, { ...filters, status: "all" });
	const previous =
		valid && filters.compare ? buildReport(w, previousPeriod(filters)) : null;
	const today = warehouseDay(Date.now(), w.timezone);
	const update = <K extends keyof ReportFilters>(
		key: K,
		value: ReportFilters[K],
	) => {
		setFilters((current) => ({ ...current, [key]: value }));
		if (key === "from" || key === "to") setPeriodSelection("");
		setSelectedRange(null);
		setOrderLimit(8);
	};
	function setPeriod(days: number | "all") {
		setPeriodSelection(String(days));
		const dates = w.orders
			.filter((order) => Number.isFinite(Date.parse(order.created)))
			.map((order) => warehouseDay(order.created, w.timezone))
			.sort();
		setFilters((current) => ({
			...current,
			from:
				days === "all"
					? (dates[0] ?? shiftDay(today, -29))
					: shiftDay(today, 1 - days),
			to: days === "all" ? (dates.at(-1) ?? today) : today,
		}));
		setSelectedRange(null);
		setOrderLimit(8);
	}
	function selectTraffic(from: string, to: string) {
		setSelectedRange((current) =>
			current?.from === from && current.to === to ? null : { from, to },
		);
		setOrderLimit(8);
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

	function openUnpriced(section: UnpricedSection) {
		const params = new URLSearchParams({
			price: "missing",
			category: filters.category,
		});
		const orders = section === "inbound" || section === "outbound";
		if (section !== "stock") {
			params.set("from", filters.from);
			params.set("to", filters.to);
		}
		if (orders) {
			params.set("status", filters.status);
			const first = report.orders.find(
				(order) =>
					order.kind === section &&
					order.lines.some(
						(line) =>
							productPrice(
								w.products.find((product) => product.id === line.product)
									?.price,
							) === null && line.quantity > 0,
					),
			);
			if (first) params.set("order", first.id);
		} else if (section === "writeOffs") params.set("view", "writeoffs");
		void navigate(
			`${warehousePath(mode, w.id, orders ? section : "inventory")}?${params}`,
		);
	}

	function download() {
		const url = URL.createObjectURL(
			new Blob([reportCsv(w, filters)], { type: "text/csv;charset=utf-8" }),
		);
		const a = document.createElement("a");
		a.href = url;
		a.download = `gridly-${w.id}-${filters.from}-${filters.to}.csv`;
		a.click();
		URL.revokeObjectURL(url);
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
							onValueChange={(kind) => update("kind", kind)}
							items={[
								{ value: "all", label: "Все" },
								{ value: "inbound", label: "Поставки" },
								{ value: "outbound", label: "Отгрузки" },
							]}
						/>
						<Select
							aria-label="Категория отчёта"
							value={filters.category}
							onValueChange={(value) => update("category", value)}
							options={[
								{ value: "all", label: "Все категории" },
								...w.categories.map((category) => ({
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
							<Field label="С">
								<Input
									type="date"
									value={filters.from}
									onChange={(event) => update("from", event.target.value)}
								/>
							</Field>
							<Field label="По">
								<Input
									type="date"
									value={filters.to}
									onChange={(event) => update("to", event.target.value)}
								/>
							</Field>
							<Field label="Статус">
								<Select
									aria-label="Статус операций"
									value={filters.status}
									onValueChange={(value) => update("status", value)}
									options={[
										{ value: "all", label: "Все статусы" },
										...Array.from(
											new Set(w.orders.map((order) => order.status)),
										).map((status) => ({
											value: status,
											label: statusLabels[status] ?? status,
										})),
									]}
								/>
							</Field>
							<Label htmlFor={compareId} className={styles.compare}>
								<Checkbox
									id={compareId}
									checked={filters.compare}
									onCheckedChange={(value) => update("compare", value)}
								/>
								Сравнить с предыдущим периодом
							</Label>
						</div>
					</details>
				</section>
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
						<div className={`${styles.metrics} ${styles.financialMetrics}`}>
							{[
								{
									label: "Оценка поставок",
									unpricedSection: "inbound" as const,
									value: estimate(
										report.inbound.value,
										report.inbound.known,
										report.inbound.unknown,
									),
									note: `Без цены: ${report.inbound.unknown} шт.`,
									previous: previous && money(previous.inbound.value),
								},
								{
									label: "Оценка отгрузок",
									unpricedSection: "outbound" as const,
									value: estimate(
										report.outbound.value,
										report.outbound.known,
										report.outbound.unknown,
									),
									note: `Без цены: ${report.outbound.unknown} шт.`,
									previous: previous && money(previous.outbound.value),
								},
								{
									label: "Стоимость остатков",
									unpricedSection: "stock" as const,
									value: estimate(
										report.stockValue,
										report.stockQuantity - report.unpricedStock,
										report.unpricedStock,
									),
									note: `Без цены: ${report.unpricedStock} шт.`,
									previous: null,
								},
								{
									label: "Списания за период",
									unpricedSection: "writeOffs" as const,
									value:
										report.writeOffQuantity === undefined
											? "Нет данных"
											: `${report.writeOffQuantity} шт.`,
									note:
										report.writeOffValue === undefined
											? "Журнал списаний недоступен"
											: `${money(report.writeOffValue)} · без цены: ${report.unpricedWriteOffs} шт.`,
									previous: null,
								},
							].map((metric) => (
								<Card key={metric.label}>
									<CardPanel>
										<span>{metric.label}</span>
										<strong>{metric.value}</strong>
										{report.unpricedDetails[metric.unpricedSection].length >
										0 ? (
											<Button
												type="button"
												variant="text"
												size="sm"
												className={styles.unpricedLink}
												onClick={() => openUnpriced(metric.unpricedSection)}
												aria-label={`${metric.label}: посмотреть товары без цены`}
											>
												{metric.note} →
											</Button>
										) : (
											<small>{metric.note}</small>
										)}
										{metric.previous && (
											<small>Предыдущий период: {metric.previous}</small>
										)}
									</CardPanel>
								</Card>
							))}
						</div>
						<section
							ref={operations}
							tabIndex={-1}
							className={styles.chartCard}
							aria-label="Операции за выбранный период"
						>
							<div className={styles.chartHeading}>
								<div>
									<h3>
										{selectedRange
											? `Операции: ${shortDay(selectedRange.from)}${selectedRange.from !== selectedRange.to ? ` — ${shortDay(selectedRange.to)}` : ""}`
											: "Операции за период"}
									</h3>
									<p>
										{selectedRange
											? "Детализация выбранной точки графика."
											: "Выберите точку графика, статус или категорию, чтобы сузить список."}
									</p>
								</div>
								<div className={styles.headerActions}>
									<Badge tone="neutral">{detailOrders.length} операций</Badge>
									{detailOrders.length > 0 && columns.button}
									{selectedRange && (
										<Button
											variant="text"
											size="sm"
											onClick={() => setSelectedRange(null)}
										>
											Весь период
										</Button>
									)}
								</div>
							</div>
							{detailOrders.length ? (
								<div className={styles.tableScroll}>
									<Table hiddenColumns={columns.hiddenColumns}>
										<TableHeader>
											<TableRow>
												<TableHead>Заказ</TableHead>
												<TableHead>Направление</TableHead>
												<TableHead>Контрагент</TableHead>
												<TableHead>Количество</TableHead>
												<TableHead>Статус</TableHead>
												<TableHead>Дата</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{detailOrders.slice(0, orderLimit).map((order) => (
												<TableRow key={order.id}>
													<TableCell>
														<strong>{order.number}</strong>
													</TableCell>
													<TableCell>
														<Badge
															tone={
																order.kind === "inbound" ? "success" : "accent"
															}
														>
															{order.kind === "inbound"
																? "Поставка"
																: "Отгрузка"}
														</Badge>
													</TableCell>
													<TableCell>{order.party}</TableCell>
													<TableCell>
														{order.lines
															.reduce((sum, line) => sum + line.quantity, 0)
															.toLocaleString("ru-RU")}{" "}
														шт.
													</TableCell>
													<TableCell>
														<StatusBadge value={order.status} />
													</TableCell>
													<TableCell>
														{shortDay(warehouseDay(order.created, w.timezone))}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							) : (
								<Empty>
									<EmptyDescription>
										Нет операций с выбранными фильтрами.
									</EmptyDescription>
								</Empty>
							)}
							{detailOrders.length > orderLimit && (
								<Button
									variant="secondary"
									onClick={() => setOrderLimit((limit) => limit + 8)}
								>
									Показать ещё {Math.min(8, detailOrders.length - orderLimit)}
								</Button>
							)}
						</section>
					</>
				)}
			</section>
		</ScrollArea>
	);
}
