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
import { useCellSelection } from "../editor/useCellSelection";
import type { MapWarehouse } from "../warehouseFields";
import {
	type EditorOperation,
	editorReducer,
	initialEditorState,
} from "./editorState";
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
	function isLocked() {
		return inFlight.current || writeBlocked;
	}

	function changeDraft(next: LayoutDraft) {
		setDraft(next);
		setDirty(true);
		setErrors(null);
	}

	function resetDraft(next: LayoutDraft) {
		setDraft(next);
		history.reset();
		setDirty(false);
	}

	async function runOperation(
		operation: Exclude<EditorOperation, "idle">,
		work: () => Promise<void>,
	) {
		inFlight.current = true;
		dispatch({ type: "operation", operation });

		try {
			await work();
		} finally {
			inFlight.current = false;
			dispatch({ type: "operation", operation: "idle" });
		}
	}

	function apply(next: LayoutDraft) {
		if (isLocked()) return;

		history.record(draft);
		changeDraft(next);
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
		if (isLocked()) return;

		setBrush(type);

		if (!editing || !selection.selectionKeys.length) return;

		applyCells(paintCellType(cells, new Set(selection.selectionKeys), type));
	}

	function applyCategory(category: Category) {
		if (isLocked()) return;

		setCategoryId(category.id);
		setBrush(category.cold ? "cold" : "storage");

		const keys = new Set(selection.selectionKeys);

		if (!keys.size) return;

		applyCells(paintCategoryZone(cells, keys, category));
	}

	function startMode(next: typeof mode) {
		if (isLocked()) return;
		if (!editing) resetDraft(createLayoutDraft(warehouse));

		dispatch({ type: "open", mode: next });
		selection.clearSelection();
	}

	function closeEditor() {
		if (isLocked()) return;

		if (dirty) {
			setErrors(["Сохраните или отмените изменения перед закрытием редактора"]);

			return;
		}

		dispatch({ type: "close" });
		selection.clearSelection();
	}

	function undo() {
		if (isLocked()) return;

		const next = history.undo(draft);

		if (next) changeDraft(next);
	}

	function redo() {
		if (isLocked()) return;

		const next = history.redo(draft);

		if (next) changeDraft(next);
	}

	async function save() {
		if (inFlight.current || saveUnavailableReason) return;

		setErrors(null);
		await runOperation("saving", async () => {
			try {
				await command("saveMap", draft);
				setDirty(false);
				history.reset();
				dispatch({ type: "operation", operation: "idle" });
				dispatch({ type: "close" });
				selection.clearSelection();
			} catch (error) {
				setErrors([errorMessage(error)]);
			}
		});
	}

	async function optimizeRoutes(
		propose: (cells: Cell[]) => Promise<BlockRoutePlan[]>,
	) {
		if (isLocked() || !editing) return;

		await runOperation("optimizing", async () => {
			const next = await propose(draft.cells);

			history.record(draft);
			changeDraft({ ...draft, routes: next });
		});
	}

	async function confirmDiscard() {
		if (isLocked()) return;

		const isLocalOnly = versionChanged || hasConflict;

		await runOperation("discarding", async () => {
			try {
				if (!isLocalOnly && draft.draftRevision !== undefined) {
					await command("discard", { draftRevision: draft.draftRevision });
				}

				discardRejected();
				resetDraft(
					isLocalOnly
						? createLayoutDraft(warehouse)
						: fromPublishedLayout(warehouse),
				);
				setErrors(null);
				setDiscardOpen(false);
				selection.clearSelection();
			} catch (error) {
				setErrors([errorMessage(error)]);
			}
		});
	}

	function openDiscard() {
		if (!isLocked()) setDiscardOpen(true);
	}

	function cancelDiscard() {
		if (!resetting) setDiscardOpen(false);
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
		discard: openDiscard,
		cancelDiscard,
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
