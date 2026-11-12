import { useNavigate } from "react-router-dom";
import { productPrice, type Warehouse } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { Button } from "@/shared/ui/controls";
import { Card, CardPanel } from "@/shared/ui/dataDisplay";
import type { WarehouseReport } from "../../model/chartData";
import type { ReportFilters, UnpricedSection } from "../../model/report";
import styles from "./ReportFinancialMetrics.module.css";

interface ReportFinancialMetricsProps {
	report: WarehouseReport;
	previous: WarehouseReport | null;
	warehouse: Pick<Warehouse, "id" | "products">;
	filters: ReportFilters;
}

const money = (value: number) =>
	value.toLocaleString("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 2,
	});
const estimate = (value: number, known: number, unknown: number) =>
	known === 0 && unknown > 0 ? "Нет цены" : money(value);

export function ReportFinancialMetrics({
	report,
	previous,
	warehouse,
	filters,
}: ReportFinancialMetricsProps) {
	const mode = useWorkspaceMode();
	const navigate = useNavigate();

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
								warehouse.products.find(
									(product) => product.id === line.product,
								)?.price,
							) === null && line.quantity > 0,
					),
			);
			if (first) params.set("order", first.id);
		} else if (section === "writeOffs") params.set("view", "writeoffs");
		void navigate(
			`${warehousePath(mode, warehouse.id, orders ? section : "inventory")}?${params}`,
		);
	}

	return (
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
						{report.unpricedDetails[metric.unpricedSection].length > 0 ? (
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
	);
}
