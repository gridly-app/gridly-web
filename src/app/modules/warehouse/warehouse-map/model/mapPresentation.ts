import type { Cell, WarehouseView } from "@/domain/warehouse";
import { cellKey, storageCellTypes } from "@/domain/warehouse";
import type { MapGeometry } from "@/domain/warehouse/layout";
import type { LayoutRenderState } from "../lib/canvas/CanvasWarehouseRenderer";

export interface MapPresentationOptions {
	warehouse: Pick<WarehouseView<"map">, "draft" | "routePlans">;
	geometry: MapGeometry;
	selected: Cell | null;
	inspectedCells: Cell[];
	editing: boolean;
	viewing: boolean;
	configuringRoutes: boolean;
	selectionKeys: string[];
	routeEditor: {
		routes: NonNullable<LayoutRenderState["routes"]>;
		block: Cell[];
	};
}

export function getMapPresentation({
	warehouse,
	geometry,
	selected,
	inspectedCells,
	editing,
	viewing,
	configuringRoutes,
	selectionKeys,
	routeEditor,
}: MapPresentationOptions) {
	let routes: NonNullable<LayoutRenderState["routes"]>;
	if (configuringRoutes) {
		routes = routeEditor.routes;
	} else if (!editing && selected && storageCellTypes.includes(selected.type)) {
		routes = warehouse.routePlans?.find((plan) =>
			plan.keys.includes(cellKey(selected)),
		) || { inbound: [], outbound: [] };
	} else {
		routes = {
			inbound: [],
			outbound: [],
		};
	}
	const highlightedKeys = configuringRoutes
		? routeEditor.block.map(cellKey)
		: editing
			? selectionKeys
			: inspectedCells.map(cellKey);
	const zoneKeys = configuringRoutes
		? []
		: editing
			? selectionKeys
			: viewing && !warehouse.draft
				? inspectedCells
						.filter((cell) => storageCellTypes.includes(cell.type))
						.map(cellKey)
				: [];
	const { cellIndex } = geometry;
	const canAssignZone =
		zoneKeys.length > 0 &&
		zoneKeys.every((key) =>
			storageCellTypes.some((type) => type === cellIndex.get(key)?.type),
		);
	const firstZoneKey = zoneKeys[0];
	const zoneType =
		firstZoneKey === undefined ? undefined : cellIndex.get(firstZoneKey)?.type;
	const zonePanelKey = `${zoneKeys.join("|")}:${zoneType}`;

	return {
		routes,
		highlightedKeys,
		zoneKeys,
		canAssignZone,
		zonePanelKey,
		cellIndex,
	};
}

export function inspectMapSelection(
	warehouse: Pick<
		WarehouseView<"inventory" | "catalog">,
		"stock" | "products" | "categories"
	>,
	inspectedCells: Cell[],
) {
	const zone = inspectedCells[0]?.zone;
	const category = warehouse.categories.find(
		(category) => category.id === zone?.categoryId,
	);
	const keys = new Set(inspectedCells.map(cellKey));
	const productNames = new Map(
		warehouse.products.map((product) => [product.id, product.name]),
	);
	const stock = inspectedCells.length
		? warehouse.stock
				.filter((stock) => keys.has(stock.cell))
				.map((stock) => ({
					...stock,
					productName: productNames.get(stock.product),
				}))
		: [];

	return {
		cells: inspectedCells,
		zone,
		category,
		stock,
	};
}
