import type {
	BlockRoutePlan,
	Category,
	Cell,
	CommandExecutor,
	Robot,
	Stock,
	WarehouseView,
} from "@/domain/warehouse";

export interface MapInspection {
	warehouse: Pick<
		WarehouseView<"catalog" | "map" | "orders">,
		"categories" | "cells" | "orders" | "products"
	>;
	command: CommandExecutor;
	onCategory: (category: Category) => void;
	cells: Cell[];
	selected: Cell | null;
	robot: Robot | null;
	editing: boolean;
	busy: boolean;
	selectionKeys: string[];
	selectionError: string;
	clearSelection: () => void;
	zoneKeys: string[];
	canAssignZone: boolean;
	zonePanelKey: string;
	onDraft: (cells: Cell[]) => void;
	routes: Pick<BlockRoutePlan, "inbound" | "outbound">;
	inspection: {
		cells: Cell[];
		zone: Cell["zone"];
		capacity: number | undefined;
		category: Category | undefined;
		stock: (Stock & { productName: string | undefined })[];
		batchCount: number | undefined;
	};
	constructing: boolean;
}
