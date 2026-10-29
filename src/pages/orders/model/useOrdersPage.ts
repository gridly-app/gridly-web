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
	const statistics = warehouse.summary?.orders?.[page] || {
		total: undefined,
		active: undefined,
		completed: undefined,
	};
	const visibleOrders = orders
		.filter((order) =>
			(order.number + order.party).toLowerCase().includes(searchQuery),
		)
		.map((order) => ({
			...order,
			quantity: order.quantity,
			canConfirm: !!order.allowedActions?.includes("confirm"),
			createdLabel: new Date(order.created).toLocaleDateString("ru"),
			canStart: !!order.allowedActions?.includes("start"),
		}));

	function startOrder(orderId: string) {
		return command("start", orderId);
	}

	function confirmOrder(orderId: string) {
		return command("orderAction", { id: orderId, action: "confirm" });
	}

	return {
		canCreate: !!warehouse.allowedActions?.includes(`create-${page}-order`),
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
