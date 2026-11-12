import type { GridPosition } from "@/entities/warehouse";
import { requiredAt } from "@/shared/lib";

export interface RobotMotionTrack {
	readonly target: Readonly<GridPosition>;
	readonly path: readonly Readonly<GridPosition>[];
	readonly startedAt: number;
	readonly duration: number;
	readonly sample?: string | undefined;
	readonly timed?: boolean | undefined;
}

interface RobotMotionMetrics {
	segmentLengths: number[];
	cumulativeLengths: number[];
	totalLength: number;
}

const motionMetrics = new WeakMap<RobotMotionTrack, RobotMotionMetrics>();

function getMotionMetrics(track: RobotMotionTrack): RobotMotionMetrics {
	const cached = motionMetrics.get(track);

	if (cached) {
		return cached;
	}

	const segmentLengths: number[] = [];
	const cumulativeLengths = new Array(track.path.length).fill(0) as number[];
	let totalLength = 0;

	for (let index = 1; index < track.path.length; index += 1) {
		const previous = requiredAt(track.path, index - 1);
		const point = requiredAt(track.path, index);
		const length = track.timed
			? 1
			: Math.hypot(point.x - previous.x, point.y - previous.y);

		segmentLengths.push(length);
		totalLength += length;
		cumulativeLengths[index] = totalLength;
	}

	const metrics = { segmentLengths, cumulativeLengths, totalLength };

	motionMetrics.set(track, metrics);

	return metrics;
}

export function prepareRobotMotionTrack(track: RobotMotionTrack) {
	const prepared: RobotMotionTrack = Object.freeze({
		...track,
		target: Object.freeze({ ...track.target }),
		path: Object.freeze(
			track.path.map((point) => Object.freeze({ x: point.x, y: point.y })),
		),
	});
	getMotionMetrics(prepared);
	return prepared;
}

export function isRobotMotionActive(track: RobotMotionTrack, now: number) {
	return getMotionMetrics(track).totalLength > 0 && getProgress(track, now) < 1;
}

export function remainingRobotMotionPath(
	track: RobotMotionTrack,
	now: number,
): GridPosition[] {
	const { segmentLengths, totalLength } = getMotionMetrics(track);
	const progress = getProgress(track, now);
	let distance = totalLength * progress;

	for (let index = 0; index < segmentLengths.length; index += 1) {
		const length = requiredAt(segmentLengths, index);

		if (length > 0 && distance < length) {
			const from = requiredAt(track.path, index);
			const to = requiredAt(track.path, index + 1);
			const fraction = distance / length;

			return [
				{
					x: from.x + (to.x - from.x) * fraction,
					y: from.y + (to.y - from.y) * fraction,
				},
				...track.path.slice(index + 1),
			];
		}
		distance -= length;
	}

	return [{ ...track.target }];
}

export function robotMotionPosition(
	track: RobotMotionTrack,
	now: number,
	output?: GridPosition | undefined,
): GridPosition {
	const position = output || { x: track.target.x, y: track.target.y };
	const first = requiredAt(track.path, 0);

	if (!first) {
		return copyPosition(position, track.target);
	}

	const { cumulativeLengths, totalLength } = getMotionMetrics(track);

	if (totalLength === 0) {
		return copyPosition(position, track.target);
	}

	const progress = getProgress(track, now);

	if (progress <= 0) {
		return copyPosition(position, first);
	}

	if (progress >= 1) {
		return copyPosition(position, track.target);
	}

	const targetDistance = totalLength * progress;
	let low = 1;
	let high = track.path.length - 1;

	while (low < high) {
		const middle = Math.floor((low + high) / 2);

		if (requiredAt(cumulativeLengths, middle) < targetDistance) {
			low = middle + 1;
		} else {
			high = middle;
		}
	}

	const from = requiredAt(track.path, low - 1);
	const to = requiredAt(track.path, low);
	const segmentLength =
		requiredAt(cumulativeLengths, low) - requiredAt(cumulativeLengths, low - 1);

	if (segmentLength === 0) {
		return copyPosition(position, to);
	}

	const fraction =
		(targetDistance - requiredAt(cumulativeLengths, low - 1)) / segmentLength;

	position.x = from.x + (to.x - from.x) * fraction;
	position.y = from.y + (to.y - from.y) * fraction;

	return position;
}

function getProgress(track: RobotMotionTrack, now: number) {
	if (track.duration <= 0) {
		return now >= track.startedAt ? 1 : 0;
	}

	return Math.max(0, Math.min(1, (now - track.startedAt) / track.duration));
}

function copyPosition(target: GridPosition, source: GridPosition) {
	target.x = source.x;
	target.y = source.y;

	return target;
}
