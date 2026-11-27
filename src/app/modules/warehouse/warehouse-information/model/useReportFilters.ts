import { useState } from "react";

import type { WarehouseView } from "@/domain/warehouse";

import {
	type ReportFilters,
	type ReportRange,
	shiftDay,
	warehouseDay,
} from "./reportPeriod";

export const reportOrderPageSize = 8;

export type ReportPeriod = number | "all";

const defaultPeriodDays = 30;

function lastDays(today: string, days: number): ReportRange {
	return { from: shiftDay(today, 1 - days), to: today };
}

function orderDays(
	warehouse: Pick<WarehouseView<"orders">, "orders" | "timezone">,
) {
	return warehouse.orders
		.filter((order) => Number.isFinite(Date.parse(order.created)))
		.map((order) => warehouseDay(order.created, warehouse.timezone))
		.sort();
}

function isValidRange({ from, to }: ReportRange) {
	return (
		Number.isFinite(Date.parse(from)) &&
		Number.isFinite(Date.parse(to)) &&
		from <= to
	);
}

export function useReportFilters(
	warehouse: Pick<WarehouseView<"orders">, "orders" | "timezone">,
) {
	const [filters, setFilters] = useState<ReportFilters>(() => ({
		...lastDays(
			warehouseDay(Date.now(), warehouse.timezone),
			defaultPeriodDays,
		),
		kind: "all",
		status: "all",
		category: "all",
		compare: false,
	}));
	const [period, setPeriodSelection] = useState(String(defaultPeriodDays));
	const [selectedRange, setSelectedRange] = useState<ReportRange | null>(null);
	const [orderLimit, setOrderLimit] = useState(reportOrderPageSize);
	const isValid = isValidRange(filters);

	function resetDetails() {
		setSelectedRange(null);
		setOrderLimit(reportOrderPageSize);
	}

	function update<K extends keyof ReportFilters>(
		key: K,
		value: ReportFilters[K],
	) {
		setFilters((current) => ({ ...current, [key]: value }));

		if (key === "from" || key === "to") setPeriodSelection("");

		resetDetails();
	}

	function periodRange(days: ReportPeriod): ReportRange {
		const today = warehouseDay(Date.now(), warehouse.timezone);

		if (days !== "all") return lastDays(today, days);

		const dates = orderDays(warehouse);

		return {
			from: dates[0] ?? lastDays(today, defaultPeriodDays).from,
			to: dates.at(-1) ?? today,
		};
	}

	function setPeriod(days: ReportPeriod) {
		const range = periodRange(days);

		setPeriodSelection(String(days));
		setFilters((current) => ({ ...current, ...range }));
		resetDetails();
	}

	function selectRange(from: string, to: string) {
		setSelectedRange((current) =>
			current?.from === from && current.to === to ? null : { from, to },
		);
		setOrderLimit(reportOrderPageSize);
	}

	function clearRange() {
		setSelectedRange(null);
	}

	function loadMoreOrders() {
		setOrderLimit((limit) => limit + reportOrderPageSize);
	}

	return {
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
	};
}
