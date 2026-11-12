import {
	animate,
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { RadioGroup, RadioPrimitive } from "../spaceui/radio-group";
import styles from "./SegmentedControl.module.css";

interface SegmentedControlItem<T extends string> {
	value: T;
	label: string;
	disabled?: boolean | undefined;
}
export interface SegmentedControlProps<T extends string> {
	value: T;
	onValueChange: (value: T) => void;
	items: readonly SegmentedControlItem<T>[];
	"aria-label": string;
	disabled?: boolean | undefined;
}
export function SegmentedControl<T extends string>({
	value,
	onValueChange,
	items,
	disabled,
	"aria-label": label,
}: SegmentedControlProps<T>) {
	const track = useRef<HTMLDivElement>(null);
	const left = useMotionValue(4);
	const right = useMotionValue(4);
	const width = useTransform(() => Math.max(0, right.get() - left.get()));
	const reduce = useReducedMotion();
	const initialized = useRef(false);
	useLayoutEffect(() => {
		const root = track.current;
		if (!root || !items.some((item) => item.value === value)) return;
		let stop: (() => void) | undefined;
		const measure = (instant: boolean) => {
			const selected = root.querySelector<HTMLElement>("[data-checked]");
			if (!selected) return;
			const l = selected.offsetLeft;
			const r = l + selected.offsetWidth;
			stop?.();
			if (instant || reduce || !initialized.current) {
				left.jump(l);
				right.jump(r);
				initialized.current = true;
				return;
			}
			const forward = l > left.get();
			const a = animate(left, l, {
				type: "spring",
				stiffness: 420,
				damping: 30,
				delay: forward ? 0.065 : 0,
			});
			const b = animate(right, r, {
				type: "spring",
				stiffness: 420,
				damping: 30,
				delay: forward ? 0 : 0.065,
			});
			stop = () => {
				a.stop();
				b.stop();
			};
		};
		measure(false);
		let firstResize = true;
		const observer = new ResizeObserver(() => {
			if (firstResize) {
				firstResize = false;
				return;
			}
			measure(true);
		});
		observer.observe(root);
		for (const item of root.querySelectorAll('[role="radio"]'))
			observer.observe(item);
		return () => {
			observer.disconnect();
			stop?.();
		};
	}, [value, items, reduce, left, right]);
	return (
		<RadioGroup
			ref={track}
			data-rubber-segment=""
			value={value}
			onValueChange={(next) => onValueChange(next as T)}
			disabled={disabled}
			aria-label={label}
			className={styles.root}
		>
			{items.some((item) => item.value === value) && (
				<motion.span
					aria-hidden="true"
					className={styles.thumb}
					data-slot="rubber-segment-thumb"
					style={{ left, width }}
				/>
			)}
			{items.map((item) => (
				<RadioPrimitive.Root
					key={item.value}
					value={item.value}
					disabled={item.disabled}
					className={styles.item}
				>
					{item.label}
				</RadioPrimitive.Root>
			))}
		</RadioGroup>
	);
}
