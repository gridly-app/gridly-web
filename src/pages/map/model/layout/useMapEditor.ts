import { useState } from "react";
import {
	assignZone,
	type Category,
	type Cell,
	type CellType,
	type CommandExecutor,
	cellKey,
	validateMap,
	type Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { useCellSelection } from "./useCellSelection";
import { useEditHistory } from "./useEditHistory";

export type MapEditor = ReturnType<typeof useMapEditor>;

export function useMapEditor(warehouse: Warehouse, command: CommandExecutor) {
	const [editedCells, setCells] = useState(warehouse.draft || warehouse.cells);
	const [mode, setMode] = useState<"construction" | "routes">("construction");
	const [editing, setEditing] = useState(false);
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [brush, setBrush] = useState<CellType>("aisle");
	const [errors, setErrors] = useState<string[] | null>(null);
	const [discardOpen, setDiscardOpen] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [dirty, setDirty] = useState(false);
	const history = useEditHistory<Cell[]>();
	const cells = editing ? editedCells : warehouse.draft || warehouse.cells;
	const selection = useCellSelection({ cells, editing, mode });
	const {
		selected,
		selectionKeys,
		setSelected,
		cancelSelection,
		clearSelection,
	} = selection;

	function applyCells(next: Cell[], dirty = true) {
		history.record(cells);
		setCells(next);
		setDirty(dirty);
		setErrors(null);
		setSelected(
			next.find((cell) => selected && cellKey(cell) === cellKey(selected)) ||
				null,
		);
	}

	function applyType(type: CellType) {
		setBrush(type);
		if (!editing || !selectionKeys.length) {
			return;
		}
		const keys = new Set(selectionKeys);
		const next = cells.map((cell) =>
			keys.has(cellKey(cell))
				? { ...cell, type, zone: cell.type === type ? cell.zone : undefined }
				: cell,
		);

		applyCells(next);
	}

	async function persist(task: () => Promise<void>) {
		try {
			await task();
			setErrors(null);
		} catch (error) {
			setErrors([errorMessage(error)]);
		}
	}

	function cancelDiscard() {
		if (!resetting) {
			setDiscardOpen(false);
		}
	}

	function discard() {
		setDiscardOpen(true);
	}

	function startMode(next: "construction" | "routes") {
		if (dirty && next !== mode) {
			setErrors(["Сохраните изменения перед переключением режима"]);

			return;
		}
		if (!editing) setCells(warehouse.draft || warehouse.cells);
		setMode(next);
		setEditing(true);
		clearSelection();
	}

	function toggleEditor() {
		if (dirty) {
			setErrors(["Сохраните или сбросьте изменения перед закрытием редактора"]);

			return;
		}
		cancelSelection();
		clearSelection();
		setEditing(!editing);
		setCells(warehouse.draft || warehouse.cells);
	}

	function applyCategory(category: Category) {
		setCategoryId(category.id);
		setBrush(category.cold ? "cold" : "storage");
		if (!selectionKeys.length) {
			return;
		}
		try {
			const next = assignZone(
				cells.map((cell) =>
					selectionKeys.includes(cellKey(cell))
						? {
								...cell,
								type: category.cold ? ("cold" as const) : ("storage" as const),
							}
						: cell,
				),
				selectionKeys,
				{
					id: `zone-${selectionKeys.slice().sort()[0]}`,
					name: `${category.name} · ${selectionKeys[0]}`,
					categoryId: category.id,
				},
				warehouse.categories,
			);

			applyCells(next);
		} catch (error) {
			setErrors([errorMessage(error)]);
		}
	}

	function closeEditor() {
		if (dirty) {
			setErrors(["Сохраните или сбросьте изменения перед закрытием редактора"]);

			return;
		}
		setEditing(false);
		cancelSelection();
		clearSelection();
	}

	function undo() {
		const previous = history.undo(cells);

		if (previous) {
			setCells(previous);
			setDirty(true);
			setErrors(null);
		}
	}

	function redo() {
		const next = history.redo(cells);

		if (next) {
			setCells(next);
			setDirty(true);
			setErrors(null);
		}
	}

	function validate() {
		setErrors(validateMap(cells, warehouse.width, warehouse.height));
	}

	function save() {
		return persist(async () => {
			await command("draft", cells);
			setDirty(false);
		});
	}

	function publish() {
		return persist(async () => {
			await command("publish", cells);
			setDirty(false);
			setEditing(false);
		});
	}

	async function confirmDiscard() {
		setResetting(true);
		try {
			await command("discard");
			setCells(warehouse.cells);
			setDirty(false);
			history.reset();
			clearSelection();
			setErrors(null);
			setDiscardOpen(false);
		} catch (error) {
			setErrors([errorMessage(error)]);
		} finally {
			setResetting(false);
		}
	}

	function zoneSaved(next: Cell[]) {
		applyCells(next, false);
	}

	return {
		selection,
		mode,
		resetting,
		discardOpen,
		cancelDiscard,
		discard,
		startMode,
		cells,
		editing,
		brush,
		errors,
		toggleEditor,
		applyType,
		categoryId,
		applyCategory,
		closeEditor,
		canUndo: history.canUndo,
		canRedo: history.canRedo,
		undo,
		redo,
		validate,
		save,
		publish,
		confirmDiscard,
		zoneSaved,
	};
}
