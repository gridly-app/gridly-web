type Point = { x: number; y: number };

const cornerRadius = 14;

export function roundedPath(points: Point[]) {
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
