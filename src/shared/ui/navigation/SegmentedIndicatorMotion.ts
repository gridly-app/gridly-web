import {
	animate,
	motionValue,
	type AnimationPlaybackControls,
} from "motion/react";

const spring = { type: "spring", stiffness: 420, damping: 30 } as const;
const trailingEdgeDelay = 0.065;

export class SegmentedIndicatorMotion {
	readonly left = motionValue(0);
	readonly right = motionValue(0);

	private initialized = false;
	private animations: AnimationPlaybackControls[] = [];

	moveTo(left: number, width: number, instant: boolean) {
		this.stop();

		const right = left + width;

		if (instant || !this.initialized) {
			this.left.jump(left);
			this.right.jump(right);
			this.initialized = true;

			return;
		}

		const forward = left > this.left.get();
		const leftDelay = forward ? trailingEdgeDelay : 0;
		const rightDelay = forward ? 0 : trailingEdgeDelay;

		this.animations = [
			animate(this.left, left, { ...spring, delay: leftDelay }),
			animate(this.right, right, { ...spring, delay: rightDelay }),
		];
	}

	stop() {
		for (const animation of this.animations) animation.stop();

		this.animations = [];
	}
}
