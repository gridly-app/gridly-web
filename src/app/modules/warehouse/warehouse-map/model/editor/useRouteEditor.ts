import { useState } from "react";

import {
	type BlockRoutePlan,
	type Cell,
	cellKey,
	connectedBlock,
	defaultBlockRoutes,
	storageCellTypes,
} from "@/domain/warehouse";
import { useWorkspaceMode } from "@/ports/session";
import { useRouteProposal } from "@/ports/warehouse";
import { errorMessage, requiredAt } from "@/shared/lib";

import { exteriorShelfRoute } from "../../lib/shelfRoute";
import type { MapEditor } from "../draft/useMapEditor";
import { useRouteDrag } from "./useRouteDrag";

type RouteEditorSource = Pick<
	MapEditor,
	| "cells"
	| "routes"
	| "editing"
	| "busy"
	| "optimizing"
	| "setRoutes"
	| "optimizeRoutes"
	| "save"
	| "undo"
	| "redo"
	| "canUndo"
	| "canRedo"
>;

function isStorage(cell: Cell) {
	return storageCellTypes.includes(cell.type);
}

function blockRoutes(
	editor: RouteEditorSource,
	block: Cell[],
	plan: BlockRoutePlan | undefined,
	allowStorage: boolean,
) {
	if (plan) {
		return {
			...plan,
			inbound: exteriorShelfRoute(plan.inbound, block, "inbound"),
			outbound: exteriorShelfRoute(plan.outbound, block, "outbound"),
		};
	}

	if (editor.editing && block.length)
		return defaultBlockRoutes(editor.cells, block, allowStorage);

	return { inbound: [], outbound: [] };
}

export function useRouteEditor(editor: RouteEditorSource, warehouseId: string) {
	const allowStorage = useWorkspaceMode() === "sandbox";
	const proposal = useRouteProposal(warehouseId);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [direction, selectDirection] = useState<"inbound" | "outbound">(
		"inbound",
	);
	const [error, setError] = useState("");
	const selectedCell =
		editor.cells.find((cell) => cellKey(cell) === selectedKey) ?? null;
	const block = connectedBlock(editor.cells, selectedCell).filter(isStorage);
	const keys = block.map(cellKey).sort();
	const id = keys[0];
	const plan = editor.routes.find((item) => item.id === id);
	const routes = blockRoutes(editor, block, plan, allowStorage);

	function replace(next: BlockRoutePlan) {
		editor.setRoutes([
			...editor.routes.filter((item) => item.id !== next.id),
			next,
		]);
		setError("");
	}

	const drag = useRouteDrag({
		allowStorage,
		cells: editor.cells,
		block,
		direction,
		routes,
		id,
		keys,
		onCommit: replace,
		onError: setError,
	});

	async function optimize() {
		try {
			await editor.optimizeRoutes((cells) => proposal.mutateAsync(cells));
			setError("");
		} catch (optimizeError) {
			setError(errorMessage(optimizeError));
		}
	}

	function select(cell: Cell) {
		if (editor.busy || !isStorage(cell)) return;

		setSelectedKey(cellKey(cell));
		setError("");

		if (!editor.editing) return;

		const cellBlock = connectedBlock(editor.cells, cell);
		const blockKeys = cellBlock.map(cellKey).sort();
		const blockId = requiredAt(blockKeys, 0);

		if (editor.routes.some((item) => item.id === blockId)) return;

		const proposed = defaultBlockRoutes(editor.cells, cellBlock, allowStorage);

		if (proposed.inbound.length && proposed.outbound.length) {
			editor.setRoutes([
				...editor.routes,
				{ id: blockId, keys: blockKeys, ...proposed },
			]);
		}
	}

	return {
		block,
		drag,
		optimize,
		optimizing: editor.optimizing,
		routes: drag.preview ?? routes,
		direction,
		error,
		select,
		selectDirection,
		save: editor.save,
		undo: editor.undo,
		redo: editor.redo,
		canUndo: editor.canUndo,
		canRedo: editor.canRedo,
	};
}
