import type { LandingScenario } from "../../config/landingScenarios";
import { roundedPath } from "./roundedPath";

import {
	cells,
	cellSize,
	centerOf,
	height,
	shelfEdgeOffset,
	shelfLift,
	width,
} from "./scenarioMapGrid";

export function routeGeometry(
	route: LandingScenario["route"],
	raisedCells: readonly number[],
) {
	if (!route) return null;

	const points = route.cells.map(centerOf);
	const isShelfAtEnd = route.shelfEndpoint === "end";
	const approach = isShelfAtEnd ? points.at(-1) : points[0];

	if (!approach) return null;

	const shelf = centerOf(route.shelfCell);
	const lift = raisedCells.includes(route.shelfCell) ? shelfLift : 0;
	const edge = {
		x: shelf.x + Math.sign(approach.x - shelf.x) * shelfEdgeOffset,
		y: shelf.y - lift + Math.sign(approach.y - shelf.y) * shelfEdgeOffset,
	};
	const routePoints = isShelfAtEnd ? [...points, edge] : [edge, ...points];
	const bounds = `M 0 0 H ${width} V ${height} H 0 Z`;
	const shelves = cells.filter(({ isShelf }) => isShelf);
	const shelfCutouts = shelves.map(({ id, x, y }) => {
		const top = raisedCells.includes(id) ? y - shelfLift : y;

		return `M ${x} ${top} h ${cellSize} v ${cellSize} h ${-cellSize} Z`;
	});

	return {
		path: roundedPath(routePoints),
		clip: [bounds, ...shelfCutouts].join(" "),
		shelfEndpoint: route.shelfEndpoint,
	};
}
