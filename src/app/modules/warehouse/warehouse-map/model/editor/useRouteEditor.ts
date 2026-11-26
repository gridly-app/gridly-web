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
import type { MapEditor } from "../draft/useMapEditor";
import { exteriorShelfRoute } from "../../lib/shelfRoute";
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

export function useRouteEditor(editor: RouteEditorSource, warehouseId: string) {
	const allowStorage = useWorkspaceMode() === "sandbox";
	const proposal = useRouteProposal(warehouseId);
	async function optimize() {
		try {
			await editor.optimizeRoutes((cells) => proposal.mutateAsync(cells));
			setError("");
		} catch (e) {
			setError(errorMessage(e));
		}
	}
	const [selectedKey, setSelectedKey] = useState<string | null>(null);
	const [direction, selectDirection] = useState<"inbound" | "outbound">(
		"inbound",
	);
	const [error, setError] = useState("");
	const block = connectedBlock(
		editor.cells,
		editor.cells.find((c) => cellKey(c) === selectedKey) ?? null,
	).filter((c) => storageCellTypes.includes(c.type));
	const keys = block.map(cellKey).sort();
	const id = keys[0];
	const plan = editor.routes.find((p) => p.id === id);
	const routes = plan
		? {
				...plan,
				inbound: exteriorShelfRoute(plan.inbound, block, "inbound"),
				outbound: exteriorShelfRoute(plan.outbound, block, "outbound"),
			}
		: editor.editing && block.length
			? defaultBlockRoutes(editor.cells, block, allowStorage)
			: { inbound: [], outbound: [] };
	function replace(next: BlockRoutePlan) {
		editor.setRoutes([...editor.routes.filter((p) => p.id !== next.id), next]);
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
	function select(cell: Cell) {
		if (editor.busy || !storageCellTypes.includes(cell.type)) return;

		setSelectedKey(cellKey(cell));
		setError("");

		if (!editor.editing) return;

		const block = connectedBlock(editor.cells, cell);
		const keys = block.map(cellKey).sort();
		const id = requiredAt(keys, 0);

		if (editor.routes.some((plan) => plan.id === id)) return;

		const proposed = defaultBlockRoutes(editor.cells, block, allowStorage);

		if (proposed.inbound.length && proposed.outbound.length) {
			editor.setRoutes([...editor.routes, { id, keys, ...proposed }]);
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
