import type { LandingScenario } from "../config/landingScenarios";
import {
	cells,
	cellSize,
	centerOf,
	height,
	type Point,
	shelfEdgeOffset,
	shelfLift,
	width,
} from "./scenarioMapGrid";

const cornerRadius = 14;

function pathThrough(points: Point[]) {
	const commands = points.map((corner, index) => {
		const previous = points[index - 1];
		const next = points[index + 1];

		if (!previous) return `M ${corner.x} ${corner.y}`;

		const lineToCorner = `L ${corner.x} ${corner.y}`;

		if (!next) return lineToCorner;

		const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y);
		const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y);

		if (!incoming || !outgoing) return lineToCorner;

		const radius = Math.min(cornerRadius, incoming / 2, outgoing / 2);
		const curveStart = {
			x: corner.x - ((corner.x - previous.x) / incoming) * radius,
			y: corner.y - ((corner.y - previous.y) / incoming) * radius,
		};
		const curveEnd = {
			x: corner.x + ((next.x - corner.x) / outgoing) * radius,
			y: corner.y + ((next.y - corner.y) / outgoing) * radius,
		};

		return `L ${curveStart.x} ${curveStart.y} Q ${corner.x} ${corner.y} ${curveEnd.x} ${curveEnd.y}`;
	});

	return commands.join(" ");
}

export function routeGeometry(
	route: LandingScenario["route"],
	raisedCells: readonly number[],
) {
	if (!route) return null;

	const points = route.cells.map(centerOf);
	const endsAtShelf = route.shelfEndpoint === "end";
	const approach = endsAtShelf ? points.at(-1) : points[0];

	if (!approach) return null;

	const shelf = centerOf(route.shelfCell);
	const lift = raisedCells.includes(route.shelfCell) ? shelfLift : 0;
	const edge = {
		x: shelf.x + Math.sign(approach.x - shelf.x) * shelfEdgeOffset,
		y: shelf.y - lift + Math.sign(approach.y - shelf.y) * shelfEdgeOffset,
	};
	const routePoints = endsAtShelf ? [...points, edge] : [edge, ...points];
	const bounds = `M 0 0 H ${width} V ${height} H 0 Z`;
	const shelves = cells.filter(({ isShelf }) => isShelf);
	const shelfCutouts = shelves.map(({ id, x, y }) => {
		const top = raisedCells.includes(id) ? y - shelfLift : y;

		return `M ${x} ${top} h ${cellSize} v ${cellSize} h ${-cellSize} Z`;
	});

	return {
		path: pathThrough(routePoints),
		clip: [bounds, ...shelfCutouts].join(" "),
		shelfEndpoint: route.shelfEndpoint,
	};
}
