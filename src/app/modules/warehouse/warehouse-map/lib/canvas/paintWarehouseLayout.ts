import {
	type Cell,
	cellKey,
	connectedBlock,
	type GridPosition,
	storageCellTypes,
} from "@/domain/warehouse";

import { cellCenter, cellOrigin, gridInset } from "../../config/grid";
import { mapThemes, routeColors } from "../../config/mapTheme";
import { shelfRoutePoints } from "../shelfRoute";
import type { LayoutRenderState } from "./CanvasWarehouseRenderer";

type MapTheme = (typeof mapThemes)["light"];

type RouteKind = "inbound" | "outbound";

const cellGap = 2;
const cellRadius = 3;
const perimeterGap = 2;
const perimeterRadius = 5;
const cellSymbols: Partial<Record<Cell["type"], string>> = {
	charge: "ϟ",
	unload: "↓",
	load: "↑",
};
const routeStyles = [
	{ kind: "inbound", dash: [] },
	{ kind: "outbound", dash: [6, 4] },
] as const;

function isStorage(cell: Cell) {
	return storageCellTypes.includes(cell.type);
}

function paintStorageCell(
	ctx: CanvasRenderingContext2D,
	cell: Cell,
	size: number,
	storage: Map<string, Cell>,
) {
	const x = cellOrigin(cell.x, size);
	const y = cellOrigin(cell.y, size);

	function gapTowards(dx: number, dy: number) {
		const neighbour = storage.get(`${cell.x + dx},${cell.y + dy}`);
		const isSameZone =
			neighbour?.type === cell.type && neighbour?.zone?.id === cell.zone?.id;

		return isSameZone ? 0 : cellGap;
	}

	const left = gapTowards(-1, 0);
	const right = gapTowards(1, 0);
	const top = gapTowards(0, -1);
	const bottom = gapTowards(0, 1);
	const corner = (first: number, second: number) =>
		first && second ? cellRadius : 0;

	ctx.beginPath();
	ctx.roundRect(x + left, y + top, size - left - right, size - top - bottom, [
		corner(left, top),
		corner(right, top),
		corner(right, bottom),
		corner(left, bottom),
	]);
	ctx.fill();
}

function paintPlainCell(
	ctx: CanvasRenderingContext2D,
	cell: Cell,
	size: number,
	theme: MapTheme,
) {
	const x = cellOrigin(cell.x, size);
	const y = cellOrigin(cell.y, size);

	ctx.beginPath();
	ctx.roundRect(
		x + cellGap,
		y + cellGap,
		size - 2 * cellGap,
		size - 2 * cellGap,
		cellRadius,
	);
	ctx.fill();

	if (cell.type !== "wall") return;

	ctx.strokeStyle = theme.wallBorder;
	ctx.lineWidth = 1;
	ctx.stroke();
}

function paintCellShape(
	ctx: CanvasRenderingContext2D,
	cell: Cell,
	size: number,
	theme: MapTheme,
	storage: Map<string, Cell>,
) {
	ctx.fillStyle = theme.cells[cell.type];

	if (isStorage(cell)) {
		paintStorageCell(ctx, cell, size, storage);

		return;
	}

	paintPlainCell(ctx, cell, size, theme);
}

function paintCellSymbol(
	ctx: CanvasRenderingContext2D,
	cell: Cell,
	size: number,
	theme: MapTheme,
) {
	const symbol = cellSymbols[cell.type];

	if (!symbol) return;

	ctx.fillStyle = theme.symbol;
	ctx.font = `${size * 0.4}px Geist, sans-serif`;
	ctx.fillText(
		symbol,
		cellOrigin(cell.x, size) + size / 2,
		cellOrigin(cell.y, size) + size * 0.65,
	);
}

function paintSelectionOutline(
	ctx: CanvasRenderingContext2D,
	cell: Cell,
	size: number,
	theme: MapTheme,
	selected: Set<string>,
) {
	const x = cellOrigin(cell.x, size);
	const y = cellOrigin(cell.y, size);
	const edges = [
		{ neighbour: `${cell.x},${cell.y - 1}`, from: [x, y], to: [x + size, y] },
		{
			neighbour: `${cell.x + 1},${cell.y}`,
			from: [x + size, y],
			to: [x + size, y + size],
		},
		{
			neighbour: `${cell.x},${cell.y + 1}`,
			from: [x, y + size],
			to: [x + size, y + size],
		},
		{ neighbour: `${cell.x - 1},${cell.y}`, from: [x, y], to: [x, y + size] },
	] as const;

	ctx.fillStyle = theme.selectionFill;
	ctx.fill();
	ctx.strokeStyle = theme.selection;
	ctx.lineWidth = 2;
	ctx.beginPath();

	for (const { neighbour, from, to } of edges) {
		if (selected.has(neighbour)) continue;

		ctx.moveTo(...from);
		ctx.lineTo(...to);
	}

	ctx.stroke();
}

function paintCells(
	ctx: CanvasRenderingContext2D,
	state: LayoutRenderState,
	theme: MapTheme,
	selected: Set<string>,
) {
	const { cells, size } = state;
	const storage = new Map(
		cells.filter(isStorage).map((cell) => [cellKey(cell), cell]),
	);

	for (const cell of cells) {
		const isSelectedCell =
			!selected.size &&
			state.selected?.x === cell.x &&
			state.selected?.y === cell.y;

		paintCellShape(ctx, cell, size, theme, storage);
		paintCellSymbol(ctx, cell, size, theme);

		if (selected.has(cellKey(cell)))
			paintSelectionOutline(ctx, cell, size, theme, selected);

		if (isSelectedCell) {
			ctx.strokeStyle = theme.selection;
			ctx.lineWidth = 2;
			ctx.strokeRect(
				cellOrigin(cell.x, size) + 1,
				cellOrigin(cell.y, size) + 1,
				size - 2,
				size - 2,
			);
		}
	}
}

function selectedShelf(
	{ cells, selected }: LayoutRenderState,
	selectedKeys: Set<string>,
) {
	if (selected && isStorage(selected)) return connectedBlock(cells, selected);

	return cells.filter(
		(cell) => selectedKeys.has(cellKey(cell)) && isStorage(cell),
	);
}

function paintRouteArrow(
	ctx: CanvasRenderingContext2D,
	path: GridPosition[],
	size: number,
) {
	const end = path.at(-1);
	const previous = path.at(-2);

	if (!end || !previous) return;

	const arrow = Math.max(6, size * 0.2);

	ctx.translate(cellCenter(end.x, size), cellCenter(end.y, size));
	ctx.rotate(Math.atan2(end.y - previous.y, end.x - previous.x));
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(-arrow, -arrow * 0.65);
	ctx.lineTo(0, 0);
	ctx.lineTo(-arrow, arrow * 0.65);
	ctx.stroke();
}

function paintRoutes(
	ctx: CanvasRenderingContext2D,
	state: LayoutRenderState,
	shelf: Cell[],
) {
	const { routes, size } = state;

	for (const { kind, dash } of routeStyles) {
		const path = shelfRoutePoints(routes?.[kind] ?? [], shelf, kind, size);

		if (!path.length) continue;

		ctx.save();
		ctx.strokeStyle = routeColors[kind];
		ctx.lineWidth = Math.max(2, size * 0.08);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.setLineDash([...dash]);
		ctx.beginPath();

		for (const [index, point] of path.entries()) {
			const x = cellCenter(point.x, size);
			const y = cellCenter(point.y, size);

			if (index === 0) {
				ctx.moveTo(x, y);

				continue;
			}

			ctx.lineTo(x, y);
		}

		ctx.stroke();
		paintRouteArrow(ctx, path, size);
		ctx.restore();
	}
}

function paintPoint(
	ctx: CanvasRenderingContext2D,
	point: GridPosition,
	size: number,
	radius: number,
) {
	ctx.beginPath();
	ctx.arc(
		cellCenter(point.x, size),
		cellCenter(point.y, size),
		radius,
		0,
		Math.PI * 2,
	);
}

function routeEndpoints(
	path: GridPosition[],
	dragHandle: LayoutRenderState["routeDragHandle"],
) {
	const start = path[0];
	const end = path.at(-1);

	if (!dragHandle) return [start, end];

	const isDraggingEnd =
		dragHandle.index > 0 && dragHandle.index >= path.length - 1;

	return [
		dragHandle.index === 0 ? dragHandle.point : start,
		isDraggingEnd ? dragHandle.point : end,
	];
}

function paintRouteHandles(
	ctx: CanvasRenderingContext2D,
	state: LayoutRenderState,
	kind: RouteKind,
) {
	const { routes, routeDragHandle, size } = state;
	const path = routes?.[kind] ?? [];
	const color = routeColors[kind];
	const handleRadius = Math.max(8, size * 0.32);

	for (const point of path.slice(1, -1)) {
		paintPoint(ctx, point, size, Math.max(2, size * 0.1));
		ctx.fillStyle = color;
		ctx.fill();
	}

	if (routeDragHandle) {
		paintPoint(ctx, routeDragHandle.point, size, handleRadius);
		ctx.strokeStyle = routeColors.inbound;
		ctx.lineWidth = 3;
		ctx.stroke();
	}

	for (const [index, point] of routeEndpoints(
		path,
		routeDragHandle,
	).entries()) {
		if (!point) continue;

		paintPoint(ctx, point, size, handleRadius);
		ctx.fillStyle = "#fff";
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.fillStyle = color;
		ctx.font = "bold 10px Geist, sans-serif";
		ctx.fillText(
			String(index + 1),
			cellCenter(point.x, size),
			cellCenter(point.y, size) + 3,
		);
	}
}

function paintPerimeter(
	ctx: CanvasRenderingContext2D,
	{ warehouse, size }: LayoutRenderState,
	theme: MapTheme,
) {
	const origin = gridInset - perimeterGap;

	ctx.beginPath();
	ctx.roundRect(
		origin,
		origin,
		warehouse.width * size + 2 * perimeterGap,
		warehouse.height * size + 2 * perimeterGap,
		perimeterRadius,
	);
	ctx.strokeStyle = theme.perimeter;
	ctx.lineWidth = 1;
	ctx.stroke();
}

export function paintWarehouseLayout(
	ctx: CanvasRenderingContext2D,
	state: LayoutRenderState,
) {
	const theme = mapThemes[state.dark ? "dark" : "light"];
	const selected = new Set(state.selectionKeys);
	const { routes, routeHandles } = state;

	ctx.font = "10px Geist, sans-serif";
	ctx.textAlign = "center";

	paintCells(ctx, state, theme, selected);
	paintRoutes(ctx, state, selectedShelf(state, selected));

	if (routeHandles && routes?.[routeHandles].length)
		paintRouteHandles(ctx, state, routeHandles);

	paintPerimeter(ctx, state, theme);
}
