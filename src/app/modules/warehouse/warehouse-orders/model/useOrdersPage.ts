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
	kind: page,
	warehouse,
	command,
}: OrdersPageOptions & {
	warehouse: OrderScreenWarehouse;
	command: CommandExecutor;
}) {
	const [params, setParams] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const confirming = useSingleFlight();
	const status = params.get("status") || "all";
	const category = params.get("category") || "all";
	const unpriced = params.get("price") === "missing";
	const from = params.get("from") || "";
	const to = params.get("to") || "";
	const setFilter = (key: string, value: string) =>
		updateSearchParams({ [key]: value === "all" ? null : value });
	const setStatus = (value: string) => setFilter("status", value);
	const setCategory = (value: string) => setFilter("category", value);
	const resetFilters = () => setParams({}, { replace: true });
	const [search, setSearch] = useState("");
	const orders = warehouse.orders.filter((order) => order.kind === page);
	const matchingOrders = filterOrders(
		warehouse.orders,
		warehouse.products,
		warehouse.timezone,
		{ kind: page, status, category, unpriced, from, to, search },
	);
	const visibleOrders = matchingOrders.map((order) => ({
		...order,
		quantity:
			order.quantity ??
			order.lines.reduce((sum, line) => sum + line.quantity, 0),
		cost: orderValue(order, warehouse.products),
		canConfirm: !!order.allowedActions?.includes("confirm"),
		createdLabel: new Date(order.created).toLocaleString("ru-RU", {
			timeZone: warehouse.timezone,
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		}),
		canStart: !!order.allowedActions?.includes("start"),
	}));

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
			statuses: [...new Set(orders.map((o) => o.status))],
			categories: warehouse.categories,
			search,
			setSearch,
		},
		canCreate: !!warehouse.allowedActions?.includes(`create-${page}-order`),
		empty: visibleOrders.length === 0,
		visibleOrders,
		startOrder,
		confirmOrder,
	};
}
