import { useState } from "react";
import type { CommandExecutor, Order, Warehouse } from "@/entities/warehouse";

export interface OrdersPageOptions {
	kind: Order["kind"];
}

export function useOrdersPage({
	kind: page,
	warehouse,
	command,
	pending,
}: OrdersPageOptions & {
	warehouse: Warehouse;
	command: CommandExecutor;
	pending: boolean;
}) {
	const [search, setSearch] = useState("");
	const searchQuery = search.toLowerCase();
	const orders = warehouse.orders.filter((order) => order.kind === page);
	const statistics = {
		total: orders.length,
		active: orders.filter((order) =>
			[
				"running",
				"waiting",
				"in_progress",
				"awaiting_load",
				"aborting",
			].includes(order.status),
		).length,
		completed: orders.filter((order) =>
			["received", "received_with_losses", "shipped"].includes(order.status),
		).length,
	};
	const visibleOrders = orders
		.filter((order) =>
			(order.number + order.party).toLowerCase().includes(searchQuery),
		)
		.map((order) => ({
			...order,
			quantity: order.lines.reduce((total, line) => total + line.quantity, 0),
			canConfirm: order.status === "waiting",
			createdLabel: new Date(order.created).toLocaleDateString("ru"),
			canStart: order.allowedActions
				? order.allowedActions.includes("start")
				: order.status === "draft",
		}));

	function startOrder(orderId: string) {
		return command("start", orderId);
	}

	function confirmOrder(orderId: string) {
		return command("confirm", orderId);
	}

	return {
		empty: orders.length === 0,
		visibleOrders,
		statistics,
		page,
		search,
		setSearch,
		pending,
		startOrder,
		confirmOrder,
	};
}
