import type { TrafficBucket } from "./chartData";

export type TrafficSeries = Record<"inbound" | "outbound", boolean>;

export const plotViewBox = { width: 800, height: 264 };
export const plotBounds = { left: 52, right: 780, top: 20, bottom: 224 };
export const axisLabelY = 252;
export const gridSteps = 4;

const minimumPointHalfWidth = 8;
const minimumPointWidth = 16;

function visibleValues(buckets: TrafficBucket[], visible: TrafficSeries) {
	return buckets.flatMap((bucket) => [
		visible.inbound ? bucket.inbound : 0,
		visible.outbound ? bucket.outbound : 0,
	]);
}

export function trafficPlotGeometry(
	buckets: TrafficBucket[],
	preceding: TrafficBucket[],
	visible: TrafficSeries,
) {
	const { left, right, top, bottom } = plotBounds;
	const width = right - left;
	const maximum = Math.max(
		1,
		...visibleValues(buckets, visible),
		...visibleValues(preceding, visible),
	);
	const ceiling = Math.ceil(maximum / gridSteps) * gridSteps;
	const pointWidth = width / Math.max(1, buckets.length - 1);

	function x(index: number) {
		if (buckets.length === 1) return (left + right) / 2;

		return left + (index / (buckets.length - 1)) * width;
	}

	function y(value: number) {
		return bottom - (value / ceiling) * (bottom - top);
	}

	function line(data: TrafficBucket[], kind: keyof TrafficSeries) {
		return data
			.map(
				(bucket, index) =>
					`${index ? "L" : "M"} ${x(index)} ${y(bucket[kind])}`,
			)
			.join(" ");
	}

	function pointLeft(index: number) {
		return Math.max(
			left,
			x(index) - Math.max(minimumPointHalfWidth, pointWidth / 2),
		);
	}

	return {
		ceiling,
		x,
		y,
		line,
		pointLeft,
		pointWidth: Math.min(width, Math.max(minimumPointWidth, pointWidth)),
	};
}

export type TrafficPlotGeometry = ReturnType<typeof trafficPlotGeometry>;
