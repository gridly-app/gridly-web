import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
	type CommandExecutor,
	type Order,
	orderValue,
} from "@/domain/warehouse";
import { useSingleFlight, useUpdateSearchParams } from "@/shared/lib";

import { filterOrders } from "./orderFilters";
import type { OrderScreenWarehouse } from "./warehouseResources";

export interface OrdersPageOptions {
	kind: Order["kind"];
}

export function useOrdersPage({
	kind,
	warehouse,
	command,
}: OrdersPageOptions & {
	warehouse: OrderScreenWarehouse;
	command: CommandExecutor;
}) {
	const [params, setParams] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const confirming = useSingleFlight();
	const [search, setSearch] = useState("");
	const status = params.get("status") || "all";
	const category = params.get("category") || "all";
	const unpriced = params.get("price") === "missing";
	const from = params.get("from") || "";
	const to = params.get("to") || "";
	const kindOrders = warehouse.orders.filter((order) => order.kind === kind);
	const filters = { kind, status, category, unpriced, from, to, search };
	const visibleOrders = filterOrders(
		warehouse.orders,
		warehouse.products,
		warehouse.timezone,
		filters,
	).map((order) => ({
		...order,
		quantity:
			order.quantity ??
			order.lines.reduce((sum, line) => sum + line.quantity, 0),
		cost: orderValue(order, warehouse.products),
		canConfirm: Boolean(order.allowedActions?.includes("confirm")),
		canStart: Boolean(order.allowedActions?.includes("start")),
		createdLabel: new Date(order.created).toLocaleString("ru-RU", {
			timeZone: warehouse.timezone,
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}),
	}));

	function setFilter(key: string, value: string) {
		updateSearchParams({ [key]: value === "all" ? null : value });
	}

	function setStatus(value: string) {
		setFilter("status", value);
	}

	function setCategory(value: string) {
		setFilter("category", value);
	}

	function resetFilters() {
		setParams({}, { replace: true });
	}

	function startOrder(orderId: string) {
		return command("start", orderId);
	}

	function confirmOrder(order: Order) {
		return confirming.run(() =>
			command("orderAction", {
				id: order.id,
				action: "confirm",
				revision: order.revision,
			}),
		);
	}

	return {
		unpriced,
		from,
		to,
		filters: {
			resetFilters,
			status,
			setStatus,
			category,
			setCategory,
			statuses: [...new Set(kindOrders.map((order) => order.status))],
			categories: warehouse.categories,
			search,
			setSearch,
		},
		canCreate: Boolean(
			warehouse.allowedActions?.includes(`create-${kind}-order`),
		),
		isEmpty: visibleOrders.length === 0,
		visibleOrders,
		startOrder,
		confirmOrder,
	};
}
