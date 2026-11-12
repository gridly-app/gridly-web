import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	type CommandExecutor,
	type Order,
	orderValue,
	productPrice,
	type Warehouse,
} from "@/entities/warehouse";

export interface OrdersPageOptions {
	kind: Order["kind"];
}

export function useOrdersPage({
	kind: page,
	warehouse,
	command,
}: OrdersPageOptions & {
	warehouse: Warehouse;
	command: CommandExecutor;
}) {
	const [params, setParams] = useSearchParams();
	const status = params.get("status") || "all";
	const category = params.get("category") || "all";
	const unpriced = params.get("price") === "missing";
	const from = params.get("from") || "";
	const to = params.get("to") || "";
	const setFilter = (key: string, value: string) =>
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (value === "all") next.delete(key);
				else next.set(key, value);
				return next;
			},
			{ replace: true },
		);
	const setStatus = (value: string) => setFilter("status", value);
	const setCategory = (value: string) => setFilter("category", value);
	const resetFilters = () => setParams({}, { replace: true });
	const dayFormatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: warehouse.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const [search, setSearch] = useState("");
	const searchQuery = search.toLowerCase();
	const orders = warehouse.orders.filter((order) => order.kind === page);
	const visibleOrders = orders
		.filter((order) => {
			const day = Number.isFinite(Date.parse(order.created))
				? dayFormatter.format(new Date(order.created))
				: "";
			return (
				(!from || (!!day && day >= from)) &&
				(!to || (!!day && day <= to)) &&
				(!unpriced ||
					order.lines.some(
						(line) =>
							line.quantity > 0 &&
							(category === "all" ||
								warehouse.products.find(
									(product) => product.id === line.product,
								)?.category === category) &&
							productPrice(
								warehouse.products.find(
									(product) => product.id === line.product,
								)?.price,
							) === null,
					))
			);
		})
		.filter(
			(o) =>
				(status === "all" || o.status === status) &&
				(category === "all" ||
					o.lines.some(
						(l) =>
							warehouse.products.find((p) => p.id === l.product)?.category ===
							category,
					)),
		)
		.filter((order) =>
			(order.number + order.party).toLowerCase().includes(searchQuery),
		)
		.map((order) => ({
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

	function confirmOrder(orderId: string) {
		return command("orderAction", { id: orderId, action: "confirm" });
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
