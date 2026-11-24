import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	type CommandExecutor,
	type Order,
	orderValue,
	productPrice,
} from "@/domain/warehouse";
import type { OrderScreenWarehouse } from "./warehouseFields";

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
	const confirming = useRef(false);
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
	const dateAndPriceMatches = orders.filter((order) => {
		const day = Number.isFinite(Date.parse(order.created))
			? dayFormatter.format(new Date(order.created))
			: "";

		if (from && (!day || day < from)) return false;
		if (to && (!day || day > to)) return false;
		if (!unpriced) return true;

		return order.lines.some((line) => {
			if (!(line.quantity > 0)) return false;

			const product = warehouse.products.find(({ id }) => id === line.product);

			if (category !== "all" && product?.category !== category) return false;

			return productPrice(product?.price) === null;
		});
	});
	const statusAndCategoryMatches = dateAndPriceMatches.filter((order) => {
		if (status !== "all" && order.status !== status) return false;
		if (category === "all") return true;

		return order.lines.some((line) => {
			const product = warehouse.products.find(({ id }) => id === line.product);

			return product?.category === category;
		});
	});
	const searchMatches = statusAndCategoryMatches.filter((order) => {
		const searchableText = (order.number + order.party).toLowerCase();

		return searchableText.includes(searchQuery);
	});
	const visibleOrders = searchMatches.map((order) => ({
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

	async function confirmOrder(order: Order) {
		if (confirming.current) return;

		confirming.current = true;

		try {
			return await command("orderAction", {
				id: order.id,
				action: "confirm",
				revision: order.revision,
			});
		} finally {
			confirming.current = false;
		}
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
