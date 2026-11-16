import { useEffect, useReducer, useRef, useState } from "react";
import type {
	BlockRoutePlan,
	Category,
	Cell,
	CellType,
	CommandExecutor,
} from "@/domain/warehouse";
import { blocksLayoutWrite, type LayoutOperation } from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { useCellSelection } from "../model/editor/useCellSelection";
import type { MapWarehouse } from "../model/warehouseFields";
import { editorReducer, initialEditorState } from "./editorState";
import {
	createLayoutDraft,
	fromPublishedLayout,
	isCurrentLayout,
	type LayoutDraft,
	restoreLayoutDraft,
} from "./layoutDraft";
import { paintCategoryZone, paintCellType } from "./paintSelectedCells";
import { useEditHistory } from "./useEditHistory";

export type MapEditor = ReturnType<typeof useMapEditor>;

export function useMapEditor(
	warehouse: MapWarehouse,
	command: CommandExecutor,
	operation: LayoutOperation | null,
	discardRejected: () => void,
) {
	const [recovered] = useState(() => restoreLayoutDraft(warehouse, operation));
	const writeBlocked = blocksLayoutWrite(operation);
	const [draft, setDraft] = useState(
		() => recovered ?? createLayoutDraft(warehouse),
	);
	const [state, dispatch] = useReducer(
		editorReducer,
		recovered ? { ...initialEditorState, view: "editing" } : initialEditorState,
	);
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
	const [dirty, setDirty] = useState(!!recovered);
	const versionChanged = editing && !isCurrentLayout(draft, warehouse);
	const hasConflict =
		operation?.status === "conflict" && operation.command.action === "saveMap";
	const saveUnavailableReason = resolveSaveUnavailableReason(
		warehouse,
		writeBlocked,
		versionChanged || hasConflict,
	);
	const history = useEditHistory<LayoutDraft>();
	const cells = editing ? draft.cells : warehouse.cells;
	const routes = editing ? draft.routes : (warehouse.routePlans ?? []);
	const selection = useCellSelection({ cells, editing, mode });
	function apply(next: LayoutDraft) {
		if (inFlight.current || writeBlocked) return;
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
		if (inFlight.current || writeBlocked) return;
		setBrush(type);
		if (!editing || !selection.selectionKeys.length) return;
		applyCells(paintCellType(cells, new Set(selection.selectionKeys), type));
	}
	function applyCategory(category: Category) {
		if (inFlight.current || writeBlocked) return;
		setCategoryId(category.id);
		setBrush(category.cold ? "cold" : "storage");
		const keys = new Set(selection.selectionKeys);
		if (!keys.size) return;
		applyCells(paintCategoryZone(cells, keys, category));
	}
	function startMode(next: typeof mode) {
		if (inFlight.current || writeBlocked) return;
		if (!editing) {
			setDraft(createLayoutDraft(warehouse));
			history.reset();
			setDirty(false);
		}
		dispatch({ type: "open", mode: next });
		selection.clearSelection();
	}
	function closeEditor() {
		if (inFlight.current || writeBlocked) return;
		if (dirty) {
			setErrors(["Сохраните или отмените изменения перед закрытием редактора"]);
			return;
		}
		dispatch({ type: "close" });
		selection.clearSelection();
	}
	function undo() {
		if (inFlight.current || writeBlocked) return;
		const next = history.undo(draft);
		if (next) {
			setDraft(next);
			setDirty(true);
			setErrors(null);
		}
	}
	function redo() {
		if (inFlight.current || writeBlocked) return;
		const next = history.redo(draft);
		if (next) {
			setDraft(next);
			setDirty(true);
			setErrors(null);
		}
	}
	async function save() {
		if (inFlight.current || saveUnavailableReason) return;
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
		if (inFlight.current || writeBlocked || !editing) return;
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
		if (inFlight.current || writeBlocked) return;
		inFlight.current = true;
		dispatch({ type: "operation", operation: "discarding" });
		try {
			const localOnly = versionChanged || hasConflict;

			if (!localOnly && draft.draftRevision !== undefined) {
				await command("discard", { draftRevision: draft.draftRevision });
			}

			discardRejected();
			setDraft(
				localOnly
					? createLayoutDraft(warehouse)
					: fromPublishedLayout(warehouse),
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
	const recoveredPending = useRef(
		!!recovered && operation?.status === "sending",
	);
	useEffect(() => {
		if (!recoveredPending.current) return;
		if (operation?.status === "sending") return;

		recoveredPending.current = false;

		if (
			operation === null ||
			operation.status === "refreshing" ||
			operation.status === "refresh-failed"
		) {
			setDirty(false);
			dispatch({ type: "close" });
		}
	}, [operation]);

	return {
		selection,
		recovered: !!recovered,
		versionChanged,
		hasConflict,
		writeBlocked,
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
		busy: writeBlocked || saving || resetting || optimizing,
		optimizeRoutes,
		categoryId,
		resetting,
		discardOpen,
		setRoutes,
		applyType,
		applyCategory,
		startMode,
		closeEditor,
		undo,
		redo,
		canUndo:
			history.canUndo && !writeBlocked && !saving && !resetting && !optimizing,
		canRedo:
			history.canRedo && !writeBlocked && !saving && !resetting && !optimizing,
		save,
		zoneSaved: applyCells,
		discard: () => {
			if (!inFlight.current && !writeBlocked) setDiscardOpen(true);
		},
		cancelDiscard: () => {
			if (!resetting) setDiscardOpen(false);
		},
		confirmDiscard,
		canSave: !saveUnavailableReason,
		saveUnavailableReason,
	};
}

function resolveSaveUnavailableReason(
	warehouse: MapWarehouse,
	blocked: boolean,
	stale: boolean,
) {
	if (blocked) return "Дождитесь результата предыдущей операции с планировкой.";
	if (stale)
		return "Планировка изменилась. Проверьте текущую версию и начните новый черновик.";
	if (!warehouse.allowedActions?.includes("save-map")) {
		return "Сохранение карты недоступно: сервер не предоставляет эту возможность";
	}
}
