import { useReducer, useRef, useState } from "react";
import type {
	BlockRoutePlan,
	Category,
	Cell,
	CellType,
	CommandExecutor,
	Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { editorReducer, initialEditorState } from "./editorState";
import { paintCategoryZone, paintCellType } from "./paintSelectedCells";
import { useCellSelection } from "./useCellSelection";
import { useEditHistory } from "./useEditHistory";

export type MapEditor = ReturnType<typeof useMapEditor>;

type Draft = {
	categories: Category[];
	cells: Cell[];
	routes: BlockRoutePlan[];
	baseVersion: number;
	draftRevision?: number | undefined;
};

export function useMapEditor(warehouse: Warehouse, command: CommandExecutor) {
	const initial = (): Draft =>
		structuredClone({
			categories: warehouse.categories,
			cells: warehouse.draft ?? warehouse.cells,
			routes: warehouse.draftRoutes ?? warehouse.routePlans ?? [],
			baseVersion: warehouse.version,
			draftRevision: warehouse.draftRevision,
		});
	const [draft, setDraft] = useState(initial);
	const [state, dispatch] = useReducer(editorReducer, initialEditorState);
	const editing = state.view === "editing";
	const mode = state.mode;
	const saving = state.operation === "saving";
	const resetting = state.operation === "discarding";
	const optimizing = state.operation === "optimizing";
	const [brush, setBrush] = useState<CellType>("aisle");
	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[] | null>(null);
	const [discardOpen, setDiscardOpen] = useState(false);

	const inFlight = useRef(false);
	const [dirty, setDirty] = useState(false);
	const history = useEditHistory<Draft>();
	const cells = editing ? draft.cells : warehouse.cells;
	const routes = editing ? draft.routes : (warehouse.routePlans ?? []);
	const selection = useCellSelection({ cells, editing, mode });
	function apply(next: Draft) {
		if (inFlight.current) return;
		history.record(draft);
		setDraft(next);
		setDirty(true);
		setErrors(null);
	}
	function applyCells(next: Cell[]) {
		apply({ ...draft, cells: next });
	}
	function addCategory(category: Category) {
		apply({ ...draft, categories: [...draft.categories, category] });
	}
	function setRoutes(next: BlockRoutePlan[]) {
		apply({ ...draft, routes: next });
	}
	function applyType(type: CellType) {
		if (inFlight.current) return;
		setBrush(type);
		if (!editing || !selection.selectionKeys.length) return;
		applyCells(paintCellType(cells, new Set(selection.selectionKeys), type));
	}
	function applyCategory(category: Category) {
		if (inFlight.current) return;
		setCategoryId(category.id);
		setBrush(category.cold ? "cold" : "storage");
		const keys = new Set(selection.selectionKeys);
		if (!keys.size) return;
		applyCells(paintCategoryZone(cells, keys, category));
	}
	function startMode(next: typeof mode) {
		if (inFlight.current) return;
		if (!editing) {
			setDraft(initial());
			history.reset();
			setDirty(false);
		}
		dispatch({ type: "open", mode: next });
		selection.clearSelection();
	}
	function closeEditor() {
		if (inFlight.current) return;
		if (dirty) {
			setErrors(["Сохраните или отмените изменения перед закрытием редактора"]);
			return;
		}
		dispatch({ type: "close" });
		selection.clearSelection();
	}
	function undo() {
		if (inFlight.current) return;
		const next = history.undo(draft);
		if (next) {
			setDraft(next);
			setDirty(true);
			setErrors(null);
		}
	}
	function redo() {
		if (inFlight.current) return;
		const next = history.redo(draft);
		if (next) {
			setDraft(next);
			setDirty(true);
			setErrors(null);
		}
	}
	async function save() {
		if (inFlight.current) return;
		inFlight.current = true;
		dispatch({ type: "operation", operation: "saving" });
		setErrors(null);
		try {
			await command("saveMap", draft);
			setDirty(false);
			history.reset();
			dispatch({ type: "operation", operation: "idle" });
			dispatch({ type: "close" });
			selection.clearSelection();
		} catch (e) {
			setErrors([errorMessage(e)]);
		} finally {
			inFlight.current = false;
			dispatch({ type: "operation", operation: "idle" });
		}
	}
	async function optimizeRoutes(
		propose: (cells: Cell[]) => Promise<BlockRoutePlan[]>,
	) {
		if (inFlight.current || !editing) return;
		inFlight.current = true;
		dispatch({ type: "operation", operation: "optimizing" });
		try {
			const next = await propose(draft.cells);
			history.record(draft);
			setDraft({ ...draft, routes: next });
			setDirty(true);
			setErrors(null);
		} finally {
			inFlight.current = false;
			dispatch({ type: "operation", operation: "idle" });
		}
	}
	async function confirmDiscard() {
		if (inFlight.current) return;
		inFlight.current = true;
		dispatch({ type: "operation", operation: "discarding" });
		try {
			if (draft.draftRevision !== undefined)
				await command("discard", { draftRevision: draft.draftRevision });
			setDraft(
				structuredClone({
					categories: warehouse.categories,
					cells: warehouse.cells,
					routes: warehouse.routePlans ?? [],
					baseVersion: warehouse.version,
				}),
			);
			setDirty(false);
			history.reset();
			setErrors(null);
			setDiscardOpen(false);
			selection.clearSelection();
		} catch (e) {
			setErrors([errorMessage(e)]);
		} finally {
			inFlight.current = false;
			dispatch({ type: "operation", operation: "idle" });
		}
	}
	return {
		selection,
		mode,
		cells,
		routes,
		categories: editing ? draft.categories : warehouse.categories,
		addCategory,
		editing,
		brush,
		errors,
		dirty,
		saving,
		optimizing,
		busy: saving || resetting || optimizing,
		optimizeRoutes,
		categoryId,
		resetting,
		discardOpen,
		setRoutes,
		applyType,
		applyCategory,
		startMode,
		closeEditor,
		toggleEditor: () => (editing ? closeEditor() : startMode("construction")),
		undo,
		redo,
		canUndo: history.canUndo && !saving && !resetting && !optimizing,
		canRedo: history.canRedo && !saving && !resetting && !optimizing,
		save,
		zoneSaved: applyCells,
		discard: () => {
			if (!inFlight.current) setDiscardOpen(true);
		},
		cancelDiscard: () => {
			if (!resetting) setDiscardOpen(false);
		},
		confirmDiscard,
		canSave: !!warehouse.allowedActions?.includes("save-map"),
		saveUnavailableReason:
			"Сохранение карты недоступно: сервер не предоставляет эту возможность",
	};
}
