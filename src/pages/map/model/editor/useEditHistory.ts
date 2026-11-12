import { useState } from "react";

export function useEditHistory<T>() {
	const [past, setPast] = useState<T[]>([]);
	const [future, setFuture] = useState<T[]>([]);

	function record(value: T) {
		setPast((values) => [...values.slice(-39), value]);
		setFuture([]);
	}

	function undo(current: T) {
		if (!past.length) {
			return;
		}
		const value = past.at(-1);

		setPast(past.slice(0, -1));
		setFuture((values) => [...values, current]);

		return value;
	}

	function redo(current: T) {
		if (!future.length) {
			return;
		}
		const value = future.at(-1);

		setFuture(future.slice(0, -1));
		setPast((values) => [...values, current]);

		return value;
	}

	function reset() {
		setPast([]);
		setFuture([]);
	}

	return {
		canUndo: past.length > 0,
		canRedo: future.length > 0,
		record,
		undo,
		redo,
		reset,
	};
}
