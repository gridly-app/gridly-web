import type { Warehouse } from "@/entities/warehouse";
import { Button } from "@/shared/ui/controls";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";
import { stockCategories } from "../../../model/chartData";
import chartStyles from "../ReportChart.module.css";
import styles from "./CategoryDistribution.module.css";

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
		<section
			className={chartStyles.chartCard}
			aria-label="Остатки по категориям"
		>
			<div className={chartStyles.chartHeading}>
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
