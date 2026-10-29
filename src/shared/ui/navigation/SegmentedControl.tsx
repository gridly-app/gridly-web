import { type KeyboardEvent, useId, useRef } from "react";
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

function getNextIndex(
	key: string,
	currentIndex: number,
	itemCount: number,
	direction: number,
) {
	if (key === "Home") return 0;
	if (key === "End") return itemCount - 1;

	let step: number;
	switch (key) {
		case "ArrowRight":
			step = direction;
			break;
		case "ArrowLeft":
			step = -direction;
			break;
		case "ArrowDown":
			step = 1;
			break;
		case "ArrowUp":
			step = -1;
			break;
		default:
			return null;
	}

	return (currentIndex + step + itemCount) % itemCount;
}

export function SegmentedControl<T extends string>({
	value,
	onValueChange,
	items,
	disabled = false,
	"aria-label": label,
}: SegmentedControlProps<T>) {
	const name = useId();
	const inputs = useRef(new Map<T, HTMLInputElement>());
	const enabledItems = items.filter((item) => !item.disabled);
	const tabStopItem =
		enabledItems.find((item) => item.value === value) ?? enabledItems[0];

	function handleKey(event: KeyboardEvent<HTMLInputElement>, current: T) {
		if (disabled || enabledItems.length === 0) return;

		const textDirection =
			getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
		const currentIndex = enabledItems.findIndex(
			(item) => item.value === current,
		);
		const nextIndex = getNextIndex(
			event.key,
			currentIndex,
			enabledItems.length,
			textDirection,
		);

		if (nextIndex === null) return;
		const nextItem = enabledItems[nextIndex];

		if (!nextItem) return;
		event.preventDefault();
		onValueChange(nextItem.value);
		inputs.current.get(nextItem.value)?.focus();
	}
	return (
		<div
			className={styles.root}
			role="radiogroup"
			aria-label={label}
			aria-disabled={disabled || undefined}
		>
			{items.map((item) => (
				<label key={item.value} className={styles.option}>
					<input
						ref={(node) => {
							if (node) inputs.current.set(item.value, node);
							else inputs.current.delete(item.value);
						}}
						type="radio"
						name={name}
						value={item.value}
						className={styles.input}
						checked={value === item.value}
						disabled={disabled || item.disabled}
						tabIndex={!disabled && item === tabStopItem ? 0 : -1}
						onChange={() => onValueChange(item.value)}
						onKeyDown={(event) => handleKey(event, item.value)}
					/>
					<span className={styles.item}>{item.label}</span>
				</label>
			))}
		</div>
	);
}
