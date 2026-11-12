import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	type Stock,
	stockZoneCells,
	stockZoneNames,
	useLiveWarehouseScope,
	useSimulationCadence,
} from "@/entities/warehouse";

import { expectedDeliveries, stockRows, writeOffRows } from "./inventoryRows";

type InventoryView = "stock" | "incoming" | "writeoffs";

export function useInventoryPage() {
	const { warehouse, execute, pending } = useLiveWarehouseScope();
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
	const viewParam = params.get("view");
	const view: InventoryView =
		viewParam === "writeoffs" || viewParam === "incoming" ? viewParam : "stock";
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

	const searchFilters = { category, productFilter, searchQuery };
	const expectedProducts =
		view === "incoming"
			? expectedDeliveries(warehouse, cadence, searchFilters)
			: [];
	const visibleStock = stockRows(
		warehouse.stock,
		products,
		zoneCells,
		zoneName,
		searchFilters,
		filter,
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
	function changeView(value: InventoryView) {
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
	const writeOffs = writeOffRows(warehouse, products, searchFilters, {
		filter,
		from,
		to,
	});

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
