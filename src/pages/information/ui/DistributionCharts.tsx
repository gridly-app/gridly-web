import { useState } from "react";
import { statusLabels, type Warehouse } from "@/entities/warehouse";
import { Badge, Button, Empty, EmptyDescription } from "@/shared/ui";
import { stockCategories, type WarehouseReport } from "../model/chartData";
import styles from "./InformationPage.module.css";

interface Slice {
	key: string;
	label: string;
	value: number;
	color: string;
}
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
function Donut({
	slices,
	selected,
	onSelect,
	title,
	center,
	caption,
}: {
	slices: Slice[];
	selected: string;
	onSelect: (key: string) => void;
	title: string;
	center: number;
	caption: string;
}) {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	const circumference = 2 * Math.PI * 72;
	let accumulated = 0;
	return (
		<div className={styles.distribution}>
			<svg
				viewBox="0 0 200 200"
				role="application"
				aria-label={title}
				className={styles.donut}
			>
				<desc>{title}</desc>
				<circle
					cx="100"
					cy="100"
					r="72"
					fill="none"
					stroke="var(--muted)"
					strokeWidth="22"
				/>
				{slices
					.filter((slice) => slice.value > 0)
					.map((slice) => {
						const length = total ? (slice.value / total) * circumference : 0;
						const offset = accumulated;
						accumulated += length;
						return (
							<Button
								render={<g />}
								variant="ghost"
								tooltip={`${slice.label}: ${slice.value.toLocaleString("ru-RU")}`}
								key={slice.key}
								role="button"
								tabIndex={0}
								className={styles.donutSlice}
								aria-label={`${slice.label}: ${slice.value}. Выбрать.`}
								onClick={() => onSelect(slice.key)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										onSelect(slice.key);
									}
								}}
							>
								<circle
									cx="100"
									cy="100"
									r="72"
									fill="none"
									stroke={slice.color}
									strokeWidth={selected === slice.key ? 27 : 22}
									strokeDasharray={`${Math.max(0, length - (length < circumference ? 3 : 0))} ${circumference}`}
									strokeDashoffset={-offset}
									transform="rotate(-90 100 100)"
									opacity={
										selected === "all" || selected === slice.key ? 1 : 0.25
									}
								/>
							</Button>
						);
					})}
				<text x="100" y="99" textAnchor="middle" className={styles.donutValue}>
					{center.toLocaleString("ru-RU")}
				</text>
				<text
					x="100"
					y="122"
					textAnchor="middle"
					className={styles.donutCaption}
				>
					{caption}
				</text>
			</svg>
			<div className={styles.distributionLegend}>
				{slices.map((slice) => (
					<Button
						key={slice.key}
						variant="ghost"
						size="sm"
						selected={selected === slice.key}
						onClick={() => onSelect(slice.key)}
						className={styles.distributionItem}
					>
						<span className={styles.dot} style={{ background: slice.color }} />
						<span>{slice.label}</span>
						<strong>{slice.value.toLocaleString("ru-RU")}</strong>
					</Button>
				))}
			</div>
		</div>
	);
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
			className={styles.chartCard}
			aria-label="Распределение статусов заказов"
		>
			<div className={styles.chartHeading}>
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
export function StockDistribution({ report }: { report: WarehouseReport }) {
	const [selected, setSelected] = useState("all");
	const slices: Slice[] = [
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
			className={styles.chartCard}
			aria-label="Доступные и зарезервированные остатки"
		>
			<div className={styles.chartHeading}>
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
				<p className={styles.chartNote}>
					На складе пока нет остатков в выбранной категории.
				</p>
			)}
		</section>
	);
}
export function CategoryDistribution({
	warehouse,
	category,
	onSelect,
}: {
	warehouse: Warehouse;
	category: string;
	onSelect: (category: string) => void;
}) {
	const categories = stockCategories(warehouse);
	const max = Math.max(1, ...categories.map((item) => item.quantity));
	return (
		<section className={styles.chartCard} aria-label="Остатки по категориям">
			<div className={styles.chartHeading}>
				<div>
					<h3>Товары по категориям</h3>
					<p>Выберите категорию, чтобы связать её с остальными графиками.</p>
				</div>
				{category !== "all" && (
					<Button variant="text" size="sm" onClick={() => onSelect("all")}>
						Все категории
					</Button>
				)}
			</div>
			<div className={styles.categoryBars}>
				{categories.map((item) => (
					<Button
						key={item.id}
						variant="ghost"
						disabled={!item.id}
						selected={category === item.id}
						onClick={() => onSelect(category === item.id ? "all" : item.id)}
						className={styles.categoryBar}
						aria-label={`${item.label}: ${item.quantity} единиц. Фильтр категории.`}
					>
						<span className={styles.categoryBarLabel}>
							<span>{item.label}</span>
							<strong>
								{item.quantity.toLocaleString("ru-RU")} <small>шт.</small>
							</strong>
						</span>
						<span className={styles.categoryBarTrack}>
							<span
								style={{
									width: `${(item.quantity / max) * 100}%`,
									opacity: category === "all" || category === item.id ? 1 : 0.3,
								}}
							/>
						</span>
					</Button>
				))}
			</div>
			{!categories.length && (
				<Empty>
					<EmptyDescription>
						Нет остатков для распределения по категориям.
					</EmptyDescription>
				</Empty>
			)}
		</section>
	);
}
