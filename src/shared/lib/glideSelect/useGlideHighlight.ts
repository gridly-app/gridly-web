import { animate } from "motion";
import { useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

// React Bits Glide Select motion, adapted to the accessible Space UI listbox.
export function useGlideHighlight() {
	const [list, setList] = useState<HTMLElement | null>(null);
	const highlight = useRef<HTMLSpanElement>(null);
	const reducedMotion = useReducedMotion();
	useLayoutEffect(() => {
		if (!list) return;
		let initialized = false;
		let animation: ReturnType<typeof animate> | undefined;
		const update = () => {
			const target =
				list.querySelector<HTMLElement>("[data-highlighted]") ??
				list.querySelector<HTMLElement>("[data-selected], [data-checked]");
			const pill = highlight.current;
			if (!pill) return;
			animation?.stop();
			if (!target) {
				pill.style.opacity = "0";
				return;
			}
			animation = animate(
				pill,
				{
					x: target.offsetLeft,
					y: target.offsetTop,
					width: target.offsetWidth,
					height: target.offsetHeight,
					opacity: 1,
				},
				{
					duration: initialized && !reducedMotion ? 0.22 : 0,
					ease: [0.23, 1, 0.32, 1],
				},
			);
			initialized = true;
		};
		const observer = new MutationObserver(update);
		observer.observe(list, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["data-highlighted", "data-selected", "data-checked"],
		});
		const resize = new ResizeObserver(update);
		resize.observe(list);
		update();
		return () => {
			observer.disconnect();
			resize.disconnect();
			animation?.stop();
		};
	}, [list, reducedMotion]);
	return { listRef: setList, highlightRef: highlight };
}
