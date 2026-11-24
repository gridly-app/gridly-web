import { motion } from "motion/react";
import { RadioGroup, RadioPrimitive } from "../spaceui/radio-group";
import { useSegmentedIndicator } from "./useSegmentedIndicator";

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
	const { track, hasSelection, style } = useSegmentedIndicator(value, items);

	function handleValueChange(next: unknown) {
		const item = items.find((item) => item.value === next);

		if (disabled || !item || item.disabled) return;

		onValueChange(item.value);
	}

	return (
		<RadioGroup
			ref={track}
			data-rubber-segment=""
			value={value}
			onValueChange={handleValueChange}
			disabled={disabled}
			aria-label={label}
			className={styles.root}
		>
			{hasSelection && (
				<motion.span
					aria-hidden="true"
					className={styles.thumb}
					data-slot="rubber-segment-thumb"
					style={style}
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
