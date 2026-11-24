import { useReducedMotion, useTransform } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { SegmentedIndicatorMotion } from "./SegmentedIndicatorMotion";

export function useSegmentedIndicator(
	value: string,
	items: readonly { value: string }[],
) {
	const track = useRef<HTMLDivElement>(null);
	const [indicator] = useState(() => new SegmentedIndicatorMotion());
	const reduceMotion = useReducedMotion();
	const width = useTransform(() =>
		Math.max(0, indicator.right.get() - indicator.left.get()),
	);
	const hasSelection = items.some((item) => item.value === value);

	useLayoutEffect(() => {
		const root = track.current;

		if (!root || !hasSelection) return;

		let measuredLeft: number | undefined;
		let measuredWidth: number | undefined;

		function measure(instant: boolean) {
			const selected = root?.querySelector<HTMLElement>(
				'[role="radio"][data-checked]',
			);

			if (!selected) return;

			const { offsetLeft: left, offsetWidth: width } = selected;

			if (left === measuredLeft && width === measuredWidth) return;

			measuredLeft = left;
			measuredWidth = width;

			indicator.moveTo(left, width, instant || !!reduceMotion);
		}

		measure(false);

		const observer = new ResizeObserver(() => measure(true));
		observer.observe(root);

		for (const item of root.querySelectorAll('[role="radio"]'))
			observer.observe(item);

		return () => {
			observer.disconnect();
			indicator.stop();
		};
	}, [value, items, hasSelection, reduceMotion, indicator]);

	return { track, hasSelection, style: { left: indicator.left, width } };
}
