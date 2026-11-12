import { useRef, useState } from "react";
import {
	type Cell,
	cellKey,
	connectedBlock,
	storageCellTypes,
	toggleZoneCell,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

export interface CellSelectionOptions {
	cells: Cell[];
	editing: boolean;
	mode: "construction" | "routes";
}

export interface CellSelectionGesture {
	start: Cell;
	initial: string[];
	moved: boolean;
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
	function toggleCell(cell: Cell) {
		if (!editing) {
			setSelected(cell);

			return;
		}
		if (mode === "routes") {
			setSelectionKeys(
				connectedBlock(cells, cell)
					.filter((cell) => storageCellTypes.includes(cell.type))
					.map(cellKey),
			);
			setSelectionError("");

			return;
		}
		try {
			const keys = toggleZoneCell(cells, selectionKeys, cellKey(cell));

			setSelectionKeys(keys);
			if (!keys.length) {
				setSelected(null);
			}
			setSelectionError("");
		} catch (error) {
			setSelectionError(errorMessage(error));
		}
	}

	function selectArea(start: Cell, end: Cell) {
		try {
			let keys = [...(gesture.current?.initial || [])];

			for (const cell of cells.filter(
				(c) =>
					c.x >= Math.min(start.x, end.x) &&
					c.x <= Math.max(start.x, end.x) &&
					c.y >= Math.min(start.y, end.y) &&
					c.y <= Math.max(start.y, end.y),
			)) {
				if (!keys.includes(cellKey(cell))) {
					keys = toggleZoneCell(cells, keys, cellKey(cell));
				}
			}
			setSelectionKeys(keys);
			setSelectionError("");
		} catch (error) {
			setSelectionError(errorMessage(error));
		}
	}

	function beginSelection(cell: Cell) {
		setSelected(cell);
		if (!editing) {
			return;
		}
		if (mode === "routes") {
			toggleCell(cell);

			return;
		}
		gesture.current = { start: cell, initial: selectionKeys, moved: false };
		setSelectionError("");
	}

	function extendSelection(cell: Cell) {
		const current = gesture.current;

		if (current && (current.start.x !== cell.x || current.start.y !== cell.y)) {
			current.moved = true;
			selectArea(current.start, cell);
		}
	}

	function finishSelection(cell?: Cell | undefined) {
		const current = gesture.current;

		if (current && cell) {
			if (current.moved) {
				selectArea(current.start, cell);
			} else {
				toggleCell(cell);
			}
		}
		gesture.current = null;
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
