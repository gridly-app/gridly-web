import type { BlockRoutePlan, Category, Cell } from "@/domain/warehouse";
import type { LayoutOperation } from "@/ports/warehouse";
import type { MapWarehouse } from "../warehouseResources";

export interface LayoutDraft {
	categories: Category[];
	cells: Cell[];
	routes: BlockRoutePlan[];
	baseVersion: number;
	draftRevision?: number | undefined;
}

export function createLayoutDraft(warehouse: MapWarehouse): LayoutDraft {
	return structuredClone({
		categories: warehouse.categories,
		cells: warehouse.draft ?? warehouse.cells,
		routes: warehouse.draftRoutes ?? warehouse.routePlans ?? [],
		baseVersion: warehouse.version,
		draftRevision: warehouse.draftRevision,
	});
}

export function fromPublishedLayout(warehouse: MapWarehouse): LayoutDraft {
	return structuredClone({
		categories: warehouse.categories,
		cells: warehouse.cells,
		routes: warehouse.routePlans ?? [],
		baseVersion: warehouse.version,
	});
}

export function restoreLayoutDraft(
	warehouse: MapWarehouse,
	operation: LayoutOperation | null,
): LayoutDraft | null {
	if (operation?.command.action !== "saveMap") return null;
	if (
		operation.status === "refreshing" ||
		operation.status === "refresh-failed"
	)
		return null;

	const { value } = operation.command;

	return structuredClone({
		...value,
		categories: value.categories ?? warehouse.categories,
	});
}

export function isCurrentLayout(draft: LayoutDraft, warehouse: MapWarehouse) {
	return (
		draft.baseVersion === warehouse.version &&
		draft.draftRevision === warehouse.draftRevision
	);
}
