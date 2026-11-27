import { Button } from "@/shared/ui/controls";
import { Empty, EmptyDescription } from "@/shared/ui/feedback";

import { formatNumber } from "../../lib/formatNumber";
import { stockCategories } from "../../model/chartData";
import type { ReportWarehouse } from "../../model/warehouseResources";

import chartStyles from "../../shared.module.css";
import styles from "./CategoryDistribution.module.css";

const dimmedOpacity = 0.3;

export function CategoryDistribution({
	warehouse,
	category,
	onSelect,
}: {
	warehouse: ReportWarehouse;
	category: string;
	onSelect: (category: string) => void;
}) {
	const categories = stockCategories(warehouse);
	const maxQuantity = Math.max(1, ...categories.map((item) => item.quantity));

	function handleShowAll() {
		onSelect("all");
	}

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
					<Button variant="text" size="sm" onClick={handleShowAll}>
						Все категории
					</Button>
				)}
			</div>
			<div className={styles.categoryBars}>
				{categories.map((item) => {
					const isSelected = category === item.id;
					const isHighlighted = category === "all" || isSelected;
					const barStyle = {
						width: `${(item.quantity / maxQuantity) * 100}%`,
						opacity: isHighlighted ? 1 : dimmedOpacity,
					};

					return (
						<Button
							key={item.id}
							variant="ghost"
							disabled={!item.id}
							selected={isSelected}
							onClick={() => onSelect(isSelected ? "all" : item.id)}
							className={styles.categoryBar}
							aria-label={`${item.label}: ${item.quantity} единиц. Фильтр категории.`}
						>
							<span className={styles.categoryBarLabel}>
								<span>{item.label}</span>
								<strong>
									{formatNumber(item.quantity)} <small>шт.</small>
								</strong>
							</span>
							<span className={styles.categoryBarTrack}>
								<span style={barStyle} />
							</span>
						</Button>
					);
				})}
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
