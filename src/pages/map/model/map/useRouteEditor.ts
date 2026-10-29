import { useState } from "react";
import {
	type BlockRoutePlan,
	type Cell,
	cellKey,
	connectedBlock,
	defaultBlockRoutes,
	storageCellTypes,
	useRouteProposal,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import type { MapEditor } from "../layout/useMapEditor";
import { useRouteDrag } from "./useRouteDrag";
export function useRouteEditor(editor: MapEditor, warehouseId: string) {
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
	const id = keys[0] ?? "";
	const plan = editor.routes.find((p) => p.id === id);
	const routes =
		plan ??
		(editor.editing && block.length
			? defaultBlockRoutes(editor.cells, block)
			: { inbound: [], outbound: [] });
	function replace(next: BlockRoutePlan) {
		editor.setRoutes([...editor.routes.filter((p) => p.id !== next.id), next]);
		setError("");
	}
	const drag = useRouteDrag({
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
		if (editor.busy) return;
		if (storageCellTypes.includes(cell.type)) {
			const block = connectedBlock(editor.cells, cell);
			const keys = block.map(cellKey).sort();
			if (
				editor.editing &&
				!editor.routes.some((plan) => plan.id === keys[0])
			) {
				const proposed = defaultBlockRoutes(editor.cells, block);
				if (proposed.inbound.length && proposed.outbound.length)
					editor.setRoutes([
						...editor.routes,
						{ id: keys[0] ?? "", keys, ...proposed },
					]);
			}
			setSelectedKey(cellKey(cell));
			setError("");
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
		dirty: editor.dirty,
		save: editor.save,
		undo: editor.undo,
		redo: editor.redo,
		canUndo: editor.canUndo,
		canRedo: editor.canRedo,
	};
}
