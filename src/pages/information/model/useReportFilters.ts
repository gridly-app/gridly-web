import { useState } from "react";
import type { Warehouse } from "@/entities/warehouse";
import { type ReportFilters, shiftDay, warehouseDay } from "./report";

export type ReportRange = Pick<ReportFilters, "from" | "to">;
export const reportOrderPageSize = 8;

export function useReportFilters(
	warehouse: Pick<Warehouse, "orders" | "timezone">,
) {
	const [filters, setFilters] = useState<ReportFilters>(() => {
		const to = warehouseDay(Date.now(), warehouse.timezone);
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
	const [selectedRange, setSelectedRange] = useState<ReportRange | null>(null);
	const [orderLimit, setOrderLimit] = useState(reportOrderPageSize);
	const valid =
		Number.isFinite(Date.parse(filters.from)) &&
		Number.isFinite(Date.parse(filters.to)) &&
		filters.from <= filters.to;
	const today = warehouseDay(Date.now(), warehouse.timezone);
	const update = <K extends keyof ReportFilters>(
		key: K,
		value: ReportFilters[K],
	) => {
		setFilters((current) => ({ ...current, [key]: value }));
		if (key === "from" || key === "to") setPeriodSelection("");
		setSelectedRange(null);
		setOrderLimit(reportOrderPageSize);
	};
	function setPeriod(days: number | "all") {
		setPeriodSelection(String(days));
		const dates = warehouse.orders
			.filter((order) => Number.isFinite(Date.parse(order.created)))
			.map((order) => warehouseDay(order.created, warehouse.timezone))
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
		setOrderLimit(reportOrderPageSize);
	}
	function selectRange(from: string, to: string) {
		setSelectedRange((current) =>
			current?.from === from && current.to === to ? null : { from, to },
		);
		setOrderLimit(reportOrderPageSize);
	}

	return {
		filters,
		period,
		selectedRange,
		orderLimit,
		valid,
		update,
		setPeriod,
		selectRange,
		clearRange: () => setSelectedRange(null),
		loadMoreOrders: () => setOrderLimit((limit) => limit + reportOrderPageSize),
	};
}
