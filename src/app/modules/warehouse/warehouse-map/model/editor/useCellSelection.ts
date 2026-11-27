import { useRef, useState } from "react";

import {
	type Cell,
	cellKey,
	connectedBlock,
	storageCellTypes,
	toggleZoneCell,
} from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";

interface CellSelectionOptions {
	cells: Cell[];
	editing: boolean;
	mode: "construction" | "routes";
}

interface CellSelectionGesture {
	start: Cell;
	initial: string[];
	moved: boolean;
}

function isInArea(cell: Cell, start: Cell, end: Cell) {
	const isInColumns =
		cell.x >= Math.min(start.x, end.x) && cell.x <= Math.max(start.x, end.x);
	const isInRows =
		cell.y >= Math.min(start.y, end.y) && cell.y <= Math.max(start.y, end.y);

	return isInColumns && isInRows;
}

export function useCellSelection({
	cells,
	editing,
	mode,
}: CellSelectionOptions) {
	const [selected, setSelected] = useState<Cell | null>(null);
	const [selectionKeys, setSelectionKeys] = useState<string[]>([]);
	const [selectionError, setSelectionError] = useState("");
	const gesture = useRef<CellSelectionGesture | null>(null);

	function toggleZone(cell: Cell) {
		try {
			const keys = toggleZoneCell(cells, selectionKeys, cellKey(cell));

			setSelectionKeys(keys);

			if (!keys.length) setSelected(null);

			setSelectionError("");
		} catch (error) {
			setSelectionError(errorMessage(error));
		}
	}

	function toggleCell(cell: Cell) {
		if (!editing) {
			setSelected(cell);

			return;
		}

		if (mode === "routes") {
			const blockKeys = connectedBlock(cells, cell)
				.filter((item) => storageCellTypes.includes(item.type))
				.map(cellKey);

			setSelectionKeys(blockKeys);
			setSelectionError("");

			return;
		}

		toggleZone(cell);
	}

	function selectArea({ start, initial }: CellSelectionGesture, end: Cell) {
		const keys = new Set(initial);

		for (const cell of cells) {
			if (isInArea(cell, start, end)) keys.add(cellKey(cell));
		}

		setSelectionKeys([...keys]);
		setSelectionError("");
	}

	function beginSelection(cell: Cell) {
		setSelected(cell);

		if (!editing) return;

		if (mode === "routes") {
			toggleCell(cell);

			return;
		}

		gesture.current = { start: cell, initial: selectionKeys, moved: false };
		setSelectionError("");
	}

	function extendSelection(cell: Cell) {
		const current = gesture.current;
		const isStartCell =
			current?.start.x === cell.x && current.start.y === cell.y;

		if (!current || isStartCell) return;

		current.moved = true;
		selectArea(current, cell);
	}

	function finishSelection(cell?: Cell | undefined) {
		const current = gesture.current;

		gesture.current = null;

		if (!current || !cell) return;

		if (current.moved) {
			selectArea(current, cell);

			return;
		}

		toggleCell(cell);
	}

	function cancelSelection() {
		gesture.current = null;
	}

	function clearSelection() {
		setSelectionKeys([]);
		setSelected(null);
		setSelectionError("");
	}

	return {
		selected,
		selectionKeys,
		selectionError,
		setSelected,
		toggleCell,
		beginSelection,
		extendSelection,
		finishSelection,
		cancelSelection,
		clearSelection,
	};
}
