import type { CSSProperties } from "react";

const columnCount = 8;

const rowCount = 6;

export const cellSize = 94;

const cellGap = 6;

export const shelfLift = 6;

const cellPitch = cellSize + cellGap;

const cellCenter = cellSize / 2;

export const shelfEdgeOffset = cellCenter + cellGap;

export const width = columnCount * cellPitch - cellGap;

export const height = rowCount * cellPitch - cellGap;

const shelfColumns = [1, 2, 3, 4];
const shelfRows = [1, 2, 4, 5];

export const cells = Array.from({ length: columnCount * rowCount }, (_, id) => {
	const column = id % columnCount;
	const row = Math.floor(id / columnCount);
	const isShelf = shelfColumns.includes(column) && shelfRows.includes(row);

	return { id, isShelf, x: column * cellPitch, y: row * cellPitch };
});

export const viewBox = `0 0 ${width} ${height}`;

export const gridStyle = {
	aspectRatio: `${width} / ${height}`,
	"--map-columns": String(columnCount),
	"--map-rows": String(rowCount),
	"--map-column-gap": `${(cellGap / width) * 100}%`,
	"--map-row-gap": `${(cellGap / height) * 100}%`,
	"--map-shelf-lift": `${(-shelfLift / cellSize) * 100}%`,
} satisfies CSSProperties & Record<`--map-${string}`, string>;

export type Point = { x: number; y: number };

export function centerOf(id: number): Point {
	const cell = cells[id];

	if (!cell) throw new RangeError(`Unknown scenario map cell: ${id}`);

	return { x: cell.x + cellCenter, y: cell.y + cellCenter };
}
