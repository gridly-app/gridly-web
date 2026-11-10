import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	forecastLabel,
	incomingProduct,
	productPrice,
	type Stock,
	selectInventoryLive,
	stockZoneCells,
	stockZoneId,
	stockZoneNames,
	useLiveWarehouseScope,
	useSimulationCadence,
} from "@/entities/warehouse";

import type { InventoryStock } from "./inventoryStock";

export function useInventoryPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScope(selectInventoryLive);
	const cadence = useSimulationCadence(warehouse);
	const [params, setParams] = useSearchParams();
	const category = params.get("category") || "all";
	const setCategory = (value: string) =>
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.set("category", value);
				return next;
			},
			{ replace: true },
		);
	const [search, setSearch] = useState("");
	const productFilter = params.get("product");
	function setProduct(value: string) {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (value === "all") next.delete("product");
				else next.set("product", value);
				return next;
			},
			{ replace: true },
		);
	}
	const view =
		params.get("view") === "writeoffs"
			? "writeoffs"
			: params.get("view") === "incoming"
				? "incoming"
				: "stock";
	const filter =
		params.get("price") === "missing"
			? "unpriced"
			: params.get("filter") || "all";
	const from = params.get("from") || "";
	const to = params.get("to") || "";
	const [selected, setSelected] = useState<Stock | null>(null);
	const searchQuery = search.trim().toLowerCase();
	const products = useMemo(
		() => new Map(warehouse.products.map((product) => [product.id, product])),
		[warehouse.products],
	);
	const zoneName = useMemo(
		() => stockZoneNames(warehouse.cells),
		[warehouse.cells],
	);
	const zoneCells = useMemo(
		() => stockZoneCells(warehouse.cells),
		[warehouse.cells],
	);

	async function writeOffStock(value: {
		revision?: number | undefined;
		id: string;
		quantity: number;
		reason: string;
	}) {
		await execute("writeoff", value);
		setSelected((current) => (current === selected ? null : current));
	}

	function replenishment(productId: string) {
		const incoming = incomingProduct(productId, warehouse, cadence);
		return {
			...incoming,
			deliveries: incoming.deliveries.map((delivery) => ({
				...delivery,
				label: forecastLabel(delivery.forecast, warehouse.timezone),
			})),
		};
	}
	const expectedProducts =
		view === "incoming"
			? warehouse.products
					.filter(
						(product) =>
							(!productFilter || product.id === productFilter) &&
							(category === "all" || product.category === category) &&
							`${product.name} ${product.sku}`
								.toLowerCase()
								.includes(searchQuery),
					)
					.map((product) => ({
						...product,
						incoming: replenishment(product.id),
					}))
					.filter((item) => item.incoming.quantity > 0)
			: [];

	const visibleStock: InventoryStock[] = warehouse.stock
		.filter(
			(s) =>
				(filter === "zero" ? s.quantity === 0 : s.quantity > 0) &&
				(!productFilter || s.product === productFilter) &&
				(category === "all" || products.get(s.product)?.category === category),
		)
		.map((stock) => {
			const cell = zoneCells.get(stock.cell);
			return {
				...stock,
				zoneKey: cell ? stockZoneId(cell) : zoneName(stock),
				productName: products.get(stock.product)?.name,
				zoneName: zoneName(stock),
			};
		})
		.filter(
			(stock) =>
				`${stock.productName ?? ""} ${stock.zoneName} ${stock.batchId ?? stock.id} ${products.get(stock.product)?.sku ?? ""}`
					.toLowerCase()
					.includes(searchQuery) &&
				(filter !== "unpriced" ||
					(stock.quantity > 0 &&
						productPrice(products.get(stock.product)?.price) === null)) &&
				(filter !== "expired" || stock.isExpired) &&
				(filter !== "reserved" ||
					(stock.reserved !== undefined && stock.reserved > 0)),
		);

	function changeFilter(value: string) {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.delete("price");
				next.delete("filter");
				if (value === "unpriced") next.set("price", "missing");
				else if (value && value !== "all") next.set("filter", value);
				return next;
			},
			{ replace: true },
		);
	}
	function changeView(value: string) {
		setParams(
			(current) => {
				const next = new URLSearchParams();
				if (value !== "stock") next.set("view", value);
				if (productFilter) next.set("product", productFilter);
				if (current.has("category")) next.set("category", category);
				return next;
			},
			{ replace: true },
		);
		setSearch("");
	}
	function setDate(key: "from" | "to", value: string) {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (value) next.set(key, value);
				else next.delete(key);
				return next;
			},
			{ replace: true },
		);
	}
	function resetFilters() {
		setParams(view === "stock" ? {} : { view }, { replace: true });
		setSearch("");
	}
	const dayFormatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: warehouse.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const writeOffs = (warehouse.writeOffs ?? [])
		.filter((item) => {
			const product = products.get(item.product);
			const day = Number.isFinite(Date.parse(item.time))
				? dayFormatter.format(new Date(item.time))
				: "";
			return (
				(filter !== "unpriced" || item.price === null) &&
				(!productFilter || item.product === productFilter) &&
				item.quantity > 0 &&
				(category === "all" || product?.category === category) &&
				(!from || (!!day && day >= from)) &&
				(!to || (!!day && day <= to)) &&
				(product?.name || item.product).toLowerCase().includes(searchQuery)
			);
		})
		.map((item) => ({
			...item,
			productName: products.get(item.product)?.name || item.product,
		}));

	return {
		warehouse,
		productFilter,
		setProduct,
		timezone: warehouse.timezone,
		view,
		changeView,
		writeOffsAvailable: warehouse.writeOffs !== undefined,
		writeOffsEmpty: warehouse.writeOffs?.length === 0,
		setFrom: (value: string) => setDate("from", value),
		setTo: (value: string) => setDate("to", value),
		writeOffs,
		from,
		to,
		resetFilters,
		category,
		setCategory,
		categories: warehouse.categories,
		changeFilter,
		empty: !warehouse.stock.length,
		visibleStock,
		expectedProducts,
		search,
		setSearch,
		filter,
		pending,
		openWriteOff: (stock: Stock) => setSelected({ ...stock }),
		closeWriteOff: () => setSelected(null),
		selected,
		writeOffStock,
	};
}
