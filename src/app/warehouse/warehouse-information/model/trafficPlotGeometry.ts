import type { TrafficBucket } from "./chartData";

export type TrafficSeries = Record<"inbound" | "outbound", boolean>;
export const LEFT = 52,
	RIGHT = 780,
	TOP = 20,
	BOTTOM = 224;

export function trafficPlotGeometry(
	buckets: TrafficBucket[],
	preceding: TrafficBucket[],
	visible: TrafficSeries,
) {
	const maximum = Math.max(
		1,
		...buckets.flatMap((bucket) => [
			visible.inbound ? bucket.inbound : 0,
			visible.outbound ? bucket.outbound : 0,
		]),
		...preceding.flatMap((bucket) => [
			visible.inbound ? bucket.inbound : 0,
			visible.outbound ? bucket.outbound : 0,
		]),
	);
	const ceiling = Math.ceil(maximum / 4) * 4;
	const x = (index: number) =>
		buckets.length === 1
			? (LEFT + RIGHT) / 2
			: LEFT + (index / (buckets.length - 1)) * (RIGHT - LEFT);
	const y = (value: number) => BOTTOM - (value / ceiling) * (BOTTOM - TOP);
	const line = (data: TrafficBucket[], kind: keyof TrafficSeries) =>
		data
			.map(
				(bucket, index) =>
					`${index ? "L" : "M"} ${x(index)} ${y(bucket[kind])}`,
			)
			.join(" ");
	const pointWidth = (RIGHT - LEFT) / Math.max(1, buckets.length - 1);
	return {
		ceiling,
		x,
		y,
		line,
		pointLeft: (index: number) =>
			Math.max(LEFT, x(index) - Math.max(8, pointWidth / 2)),
		pointWidth: Math.min(RIGHT - LEFT, Math.max(16, pointWidth)),
	};
}

export type TrafficPlotGeometry = ReturnType<typeof trafficPlotGeometry>;
