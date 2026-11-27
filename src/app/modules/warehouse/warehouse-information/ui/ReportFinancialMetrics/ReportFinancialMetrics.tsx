import { useNavigate } from "react-router-dom";

import { productPrice, type WarehouseView } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { Button } from "@/shared/ui/controls";
import { Card, CardPanel } from "@/shared/ui/dataDisplay";

import { formatMoney } from "../../lib/formatNumber";
import type { PriceTotals, WarehouseReport } from "../../model/report";
import type { ReportFilters } from "../../model/reportPeriod";
import type { UnpricedSection } from "../../model/reportUnpricedDetails";

import styles from "./ReportFinancialMetrics.module.css";

type FinancialMetric = {
	label: string;
	section: UnpricedSection;
	value: string;
	note: string;
	previous: string | null;
};

function estimate({ value, known, unknown }: PriceTotals) {
	return known === 0 && unknown > 0 ? "Нет цены" : formatMoney(value);
}

function writeOffNote(report: WarehouseReport) {
	if (report.writeOffValue === undefined) return "Журнал списаний недоступен";

	return `${formatMoney(report.writeOffValue)} · без цены: ${report.unpricedWriteOffs} шт.`;
}

function financialMetrics(
	report: WarehouseReport,
	previous: WarehouseReport | null,
): FinancialMetric[] {
	const stockTotals = {
		value: report.stockValue,
		known: report.stockQuantity - report.unpricedStock,
		unknown: report.unpricedStock,
	};
	const writeOffValue =
		report.writeOffQuantity === undefined
			? "Нет данных"
			: `${report.writeOffQuantity} шт.`;

	return [
		{
			label: "Оценка поставок",
			section: "inbound",
			value: estimate(report.inbound),
			note: `Без цены: ${report.inbound.unknown} шт.`,
			previous: previous && formatMoney(previous.inbound.value),
		},
		{
			label: "Оценка отгрузок",
			section: "outbound",
			value: estimate(report.outbound),
			note: `Без цены: ${report.outbound.unknown} шт.`,
			previous: previous && formatMoney(previous.outbound.value),
		},
		{
			label: "Стоимость остатков",
			section: "stock",
			value: estimate(stockTotals),
			note: `Без цены: ${report.unpricedStock} шт.`,
			previous: null,
		},
		{
			label: "Списания за период",
			section: "writeOffs",
			value: writeOffValue,
			note: writeOffNote(report),
			previous: null,
		},
	];
}

export function ReportFinancialMetrics({
	report,
	previous,
	warehouse,
	filters,
}: {
	report: WarehouseReport;
	previous: WarehouseReport | null;
	warehouse: Pick<WarehouseView<"catalog">, "id" | "products">;
	filters: ReportFilters;
}) {
	const mode = useWorkspaceMode();
	const navigate = useNavigate();

	function isUnpricedLine(line: { product: string; quantity: number }) {
		const product = warehouse.products.find((item) => item.id === line.product);

		return productPrice(product?.price) === null && line.quantity > 0;
	}

	function unpricedParams(section: UnpricedSection) {
		const params = new URLSearchParams({
			price: "missing",
			category: filters.category,
		});

		if (section !== "stock") {
			params.set("from", filters.from);
			params.set("to", filters.to);
		}

		if (section === "writeOffs") params.set("view", "writeoffs");
		if (section !== "inbound" && section !== "outbound") return params;

		const firstOrder = report.orders.find(
			(order) => order.kind === section && order.lines.some(isUnpricedLine),
		);

		params.set("status", filters.status);

		if (firstOrder) params.set("order", firstOrder.id);

		return params;
	}

	function handleOpenUnpriced(section: UnpricedSection) {
		const isOrderSection = section === "inbound" || section === "outbound";
		const page = isOrderSection ? section : "inventory";

		void navigate(
			`${warehousePath(mode, warehouse.id, page)}?${unpricedParams(section)}`,
		);
	}

	return (
		<div className={`${styles.metrics} ${styles.financialMetrics}`}>
			{financialMetrics(report, previous).map((metric) => (
				<Card key={metric.label}>
					<CardPanel>
						<span>{metric.label}</span>
						<strong>{metric.value}</strong>
						{report.unpricedDetails[metric.section].length > 0 ? (
							<Button
								type="button"
								variant="text"
								size="sm"
								className={styles.unpricedLink}
								onClick={() => handleOpenUnpriced(metric.section)}
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
