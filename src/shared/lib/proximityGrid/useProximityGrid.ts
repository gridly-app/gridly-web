import { useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent } from "react";

export function useProximityGrid() {
	const pointerX = useMotionValue(-1000);
	const pointerY = useMotionValue(-1000);
	const rawActive = useMotionValue(0);
	const active = useSpring(rawActive, {
		stiffness: 480,
		damping: 36,
		mass: 0.8,
	});
	const reducedMotion = useReducedMotion();

	function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
		if (reducedMotion || event.pointerType === "touch") {
			return;
		}
		const board = event.currentTarget;

		pointerX.set(event.clientX);
		pointerY.set(event.clientY);
		rawActive.set(
			event.target instanceof Node && board.contains(event.target) ? 1 : 0,
		);
	}

	function handlePointerLeave() {
		rawActive.set(0);
	}

	return { pointerX, pointerY, active, handlePointerMove, handlePointerLeave };
}
