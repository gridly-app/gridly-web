import {
	type Cell,
	cellKey,
	storageCellTypes,
	type WarehouseView,
} from "@/domain/warehouse";
import type { MapGeometry } from "@/domain/warehouse/layout";

import type { LayoutRenderState } from "../lib/canvas/CanvasWarehouseRenderer";

type MapRoutes = NonNullable<LayoutRenderState["routes"]>;

export interface MapPresentationOptions {
	warehouse: Pick<WarehouseView<"map">, "draft" | "routePlans">;
	geometry: MapGeometry;
	selected: Cell | null;
	inspectedCells: Cell[];
	editing: boolean;
	viewing: boolean;
	configuringRoutes: boolean;
	selectionKeys: string[];
	routeEditor: { routes: MapRoutes; block: Cell[] };
}

const noRoutes: MapRoutes = { inbound: [], outbound: [] };

function isStorage(cell: Pick<Cell, "type">) {
	return storageCellTypes.includes(cell.type);
}

function presentedRoutes({
	warehouse,
	selected,
	editing,
	configuringRoutes,
	routeEditor,
}: MapPresentationOptions) {
	if (configuringRoutes) return routeEditor.routes;
	if (editing || !selected || !isStorage(selected)) return noRoutes;

	const key = cellKey(selected);

	return (
		warehouse.routePlans?.find((plan) => plan.keys.includes(key)) ?? noRoutes
	);
}

function highlightedKeys({
	inspectedCells,
	editing,
	configuringRoutes,
	selectionKeys,
	routeEditor,
}: MapPresentationOptions) {
	if (configuringRoutes) return routeEditor.block.map(cellKey);
	if (editing) return selectionKeys;

	return inspectedCells.map(cellKey);
}

function zoneKeys({
	warehouse,
	inspectedCells,
	editing,
	viewing,
	configuringRoutes,
	selectionKeys,
}: MapPresentationOptions) {
	if (configuringRoutes) return [];
	if (editing) return selectionKeys;
	if (!viewing || warehouse.draft) return [];

	return inspectedCells.filter(isStorage).map(cellKey);
}

export function getMapPresentation(options: MapPresentationOptions) {
	const { cellIndex } = options.geometry;
	const keys = zoneKeys(options);
	const canAssignZone =
		keys.length > 0 &&
		keys.every((key) =>
			storageCellTypes.some((type) => type === cellIndex.get(key)?.type),
		);
	const firstZoneKey = keys[0];
	const zoneType =
		firstZoneKey === undefined ? undefined : cellIndex.get(firstZoneKey)?.type;

	return {
		routes: presentedRoutes(options),
		highlightedKeys: highlightedKeys(options),
		zoneKeys: keys,
		canAssignZone,
		zonePanelKey: `${keys.join("|")}:${zoneType}`,
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
		(item) => item.id === zone?.categoryId,
	);
	const keys = new Set(inspectedCells.map(cellKey));
	const productNames = new Map(
		warehouse.products.map((product) => [product.id, product.name]),
	);
	const stock = warehouse.stock
		.filter((item) => keys.has(item.cell))
		.map((item) => ({ ...item, productName: productNames.get(item.product) }));

	return { cells: inspectedCells, zone, category, stock };
}
