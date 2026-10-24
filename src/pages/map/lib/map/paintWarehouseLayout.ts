import { cellKey, storageCellTypes } from "@/entities/warehouse";
import { mapThemes } from "../../model/map/mapTheme";
import type { LayoutRenderState } from "./CanvasWarehouseRenderer";

export function paintWarehouseLayout(
	ctx: CanvasRenderingContext2D,
	{
		w: warehouse,
		cells,
		selected,
		selectionKeys,
		size,
		dark,
		routes,
		routeHandles,
		routeDragHandle,
	}: LayoutRenderState,
) {
	const theme = mapThemes[dark ? "dark" : "light"];
	const palette = theme.cells;

	ctx.font = "10px Inter, sans-serif";
	ctx.textAlign = "center";
	const selectedSet = new Set(selectionKeys.length ? selectionKeys : []);

	for (const cell of cells) {
		const x = 32 + cell.x * size;
		const y = 32 + cell.y * size;

		ctx.fillStyle = palette[cell.type];
		ctx.beginPath();
		ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 3);
		ctx.fill();
		if (cell.type === "wall") {
			ctx.strokeStyle = theme.wallBorder;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		if (size > 22 && storageCellTypes.includes(cell.type)) {
			ctx.fillStyle = cell.type === "cold" ? theme.coldMark : theme.storageMark;
			ctx.fillRect(x + size * 0.2, y + size * 0.28, size * 0.6, 2);
			ctx.fillRect(x + size * 0.2, y + size * 0.64, size * 0.6, 2);
		}
		if (["unload", "load", "charge"].includes(cell.type)) {
			ctx.fillStyle = theme.symbol;
			ctx.font = `${size * 0.4}px sans-serif`;
			ctx.fillText(
				cell.type === "charge" ? "ϟ" : cell.type === "unload" ? "↓" : "↑",
				x + size / 2,
				y + size * 0.65,
			);
		}
		if (selectedSet.has(cellKey(cell))) {
			ctx.fillStyle = dark ? "rgba(160,175,255,.14)" : "rgba(85,105,210,.10)";
			ctx.fillRect(x, y, size, size);
			ctx.strokeStyle = theme.selection;
			ctx.lineWidth = 2;
			ctx.beginPath();
			if (!selectedSet.has(`${cell.x},${cell.y - 1}`)) {
				ctx.moveTo(x, y);
				ctx.lineTo(x + size, y);
			}
			if (!selectedSet.has(`${cell.x + 1},${cell.y}`)) {
				ctx.moveTo(x + size, y);
				ctx.lineTo(x + size, y + size);
			}
			if (!selectedSet.has(`${cell.x},${cell.y + 1}`)) {
				ctx.moveTo(x, y + size);
				ctx.lineTo(x + size, y + size);
			}
			if (!selectedSet.has(`${cell.x - 1},${cell.y}`)) {
				ctx.moveTo(x, y);
				ctx.lineTo(x, y + size);
			}
			ctx.stroke();
		}
		if (!selectedSet.size && selected?.x === cell.x && selected?.y === cell.y) {
			ctx.strokeStyle = theme.selection;
			ctx.lineWidth = 2;
			ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
		}
	}
	for (const [path, color, dash] of [
		[routes?.inbound, "#e86536", []],
		[routes?.outbound, "#4f83c4", [6, 4]],
	] as const) {
		if (!path?.length) {
			continue;
		}
		ctx.save();
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(2, size * 0.08);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.setLineDash([...dash]);
		ctx.beginPath();
		path.forEach((cell, index) => {
			const x = 32 + (cell.x + 0.5) * size;
			const y = 32 + (cell.y + 0.5) * size;

			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();
		const end = path[path.length - 1];

		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(
			32 + (end.x + 0.5) * size,
			32 + (end.y + 0.5) * size,
			Math.max(3, size * 0.12),
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.restore();
	}
	if (routeHandles && routes?.[routeHandles].length) {
		const path = routes[routeHandles];

		const handles = [
			routeDragHandle?.index === 0 ? routeDragHandle.point : path[0],
			routeDragHandle &&
			routeDragHandle.index > 0 &&
			routeDragHandle.index >= path.length - 1
				? routeDragHandle.point
				: path[path.length - 1],
		];

		for (const point of path.slice(1, -1)) {
			ctx.beginPath();
			ctx.arc(
				32 + (point.x + 0.5) * size,
				32 + (point.y + 0.5) * size,
				Math.max(2, size * 0.1),
				0,
				Math.PI * 2,
			);
			ctx.fillStyle = routeHandles === "inbound" ? "#e86536" : "#4f83c4";
			ctx.fill();
		}
		if (routeDragHandle) {
			ctx.beginPath();
			ctx.arc(
				32 + (routeDragHandle.point.x + 0.5) * size,
				32 + (routeDragHandle.point.y + 0.5) * size,
				Math.max(8, size * 0.32),
				0,
				Math.PI * 2,
			);
			ctx.strokeStyle = "#e86536";
			ctx.lineWidth = 3;
			ctx.stroke();
		}
		for (const [index, point] of handles.entries()) {
			const x = 32 + (point.x + 0.5) * size;
			const y = 32 + (point.y + 0.5) * size;

			ctx.beginPath();
			ctx.arc(x, y, Math.max(8, size * 0.32), 0, Math.PI * 2);
			ctx.fillStyle = "#fff";
			ctx.fill();
			ctx.strokeStyle = routeHandles === "inbound" ? "#e86536" : "#4f83c4";
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = ctx.strokeStyle;
			ctx.font = "bold 10px sans-serif";
			ctx.fillText(String(index + 1), x, y + 3);
		}
	}
	ctx.beginPath();
	ctx.roundRect(
		30,
		30,
		warehouse.width * size + 4,
		warehouse.height * size + 4,
		5,
	);
	ctx.strokeStyle = theme.perimeter;
	ctx.lineWidth = 1;
	ctx.stroke();
}
