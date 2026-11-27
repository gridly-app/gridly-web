import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
	type CommandPayloads,
	type Stock,
	stockZoneCells,
	stockZoneNames,
} from "@/domain/warehouse";
import { useLiveWarehouseScreen } from "@/ports/warehouse";
import { useUpdateSearchParams } from "@/shared/lib";

import { expectedDeliveries, stockRows, writeOffRows } from "./inventoryRows";
import { useSimulationCadence } from "./useSimulationCadence";
import { warehouseResources } from "./warehouseResources";

export type InventoryView = "stock" | "incoming" | "writeoffs";

function inventoryView(value: string | null): InventoryView {
	return value === "writeoffs" || value === "incoming" ? value : "stock";
}

export function useInventoryPage() {
	const { warehouse, execute, pending } =
		useLiveWarehouseScreen(warehouseResources);
	const cadence = useSimulationCadence(warehouse);
	const [params, setParams] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Stock | null>(null);
	const category = params.get("category") || "all";
	const productFilter = params.get("product");
	const view = inventoryView(params.get("view"));
	const filter =
		params.get("price") === "missing"
			? "unpriced"
			: params.get("filter") || "all";
	const from = params.get("from") || "";
	const to = params.get("to") || "";
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
	const searchFilters = {
		category,
		productFilter,
		searchQuery: search.trim().toLowerCase(),
	};
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
	const writeOffs = writeOffRows(warehouse, products, searchFilters, {
		filter,
		from,
		to,
	});

	async function writeOffStock(value: CommandPayloads["writeoff"]) {
		await execute("writeoff", value);
		setSelected((current) => (current === selected ? null : current));
	}

	function setCategory(value: string) {
		updateSearchParams({ category: value });
	}

	function setProduct(value: string) {
		updateSearchParams({ product: value === "all" ? null : value });
	}

	function changeFilter(value: string) {
		const isUnpriced = value === "unpriced";
		const isOtherFilter = Boolean(value) && value !== "all" && !isUnpriced;

		updateSearchParams({
			price: isUnpriced ? "missing" : null,
			filter: isOtherFilter ? value : null,
		});
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

	function setFrom(value: string) {
		updateSearchParams({ from: value || null });
	}

	function setTo(value: string) {
		updateSearchParams({ to: value || null });
	}

	function resetFilters() {
		setParams(view === "stock" ? {} : { view }, { replace: true });
		setSearch("");
	}

	function openWriteOff(stock: Stock) {
		setSelected({ ...stock });
	}

	function closeWriteOff() {
		setSelected(null);
	}

	return {
		warehouse,
		pending,
		view,
		changeView,
		search,
		setSearch,
		category,
		setCategory,
		categories: warehouse.categories,
		productFilter,
		setProduct,
		filter,
		changeFilter,
		from,
		setFrom,
		to,
		setTo,
		resetFilters,
		isStockEmpty: warehouse.stock.length === 0,
		visibleStock,
		expectedProducts,
		hasWriteOffLog: warehouse.writeOffs !== undefined,
		isWriteOffLogEmpty: warehouse.writeOffs?.length === 0,
		writeOffs,
		selected,
		openWriteOff,
		closeWriteOff,
		writeOffStock,
	};
}
