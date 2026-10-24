import { useMemo, useState } from "react";
import {
	type BlockRoutePlan,
	type Cell,
	type CommandExecutor,
	cellKey,
	connectedBlock,
	optimizeWarehouseRoutes,
	storageCellTypes,
	type Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { useEditHistory } from "../layout/useEditHistory";
import { MapGeometry } from "./MapGeometry";
import { useRouteDrag } from "./useRouteDrag";

export function useRouteEditor(warehouse: Warehouse, command: CommandExecutor) {
	const [editedPlans, setPlans] = useState<BlockRoutePlan[]>(
		warehouse.routePlans || [],
	);
	const [block, setBlock] = useState<Cell[]>([]);
	const [direction, selectDirection] = useState<"inbound" | "outbound">(
		"inbound",
	);
	const [error, setError] = useState("");
	const [dirty, setDirty] = useState(false);
	const history = useEditHistory<BlockRoutePlan[]>();
	const plans = dirty ? editedPlans : warehouse.routePlans || [];
	const keys = block.map(cellKey).sort();
	const id = keys[0];
	const plan = plans.find((plan) => plan.id === id);
	const geometry = useMemo(
		() => new MapGeometry(warehouse.cells),
		[warehouse.cells],
	);
	const routes = plan || geometry.defaultRoutes(block);

	function replace(next: BlockRoutePlan) {
		history.record(plans);
		setPlans([...plans.filter((plan) => plan.id !== next.id), next]);
		setDirty(true);
		setError("");
	}

	const drag = useRouteDrag({
		cells: warehouse.cells,
		block,
		direction,
		routes,
		id,
		keys,
		onCommit: replace,
		onError: setError,
	});

	function select(cell: Cell) {
		if (storageCellTypes.includes(cell.type)) {
			setBlock(connectedBlock(warehouse.cells, cell));
			setError("");
		}
	}

	function optimize() {
		try {
			const optimized = optimizeWarehouseRoutes(warehouse.cells);

			history.record(plans);
			setPlans(optimized);
			setDirty(true);
			setError("");
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	async function save() {
		try {
			await command("routes", plans);
			setDirty(false);
			setError("");
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	function undo() {
		const previous = history.undo(plans);

		if (previous) {
			setPlans(previous);
			setDirty(true);
		}
	}

	function redo() {
		const next = history.redo(plans);

		if (next) {
			setPlans(next);
			setDirty(true);
		}
	}

	return {
		block,
		drag,
		routes: drag.preview || routes,
		direction,
		error,
		dirty,
		select,
		optimize,
		save,
		canUndo: history.canUndo,
		canRedo: history.canRedo,
		selectDirection,
		undo,
		redo,
	};
}
