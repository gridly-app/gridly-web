import {
	type Cell,
	cellKey,
	connectedBlock,
	defaultBlockRoutes,
} from "@/entities/warehouse";

export class MapGeometry {
	readonly cellIndex: Map<string, Cell>;
	private selected: Cell | null = null;
	private block: Cell[] = [];
	private routeBlock: Cell[] | null = null;
	private routes: ReturnType<typeof defaultBlockRoutes> | null = null;

	constructor(readonly cells: Cell[]) {
		this.cellIndex = new Map(cells.map((cell) => [cellKey(cell), cell]));
	}

	inspect(selected: Cell | null): Cell[] {
		selected = selected
			? (this.cellIndex.get(cellKey(selected)) ?? null)
			: null;
		if (selected !== this.selected) {
			this.selected = selected;
			this.block = connectedBlock(this.cells, selected);
		}
		return this.block;
	}

	defaultRoutes(block: Cell[]) {
		if (this.routeBlock !== block || !this.routes) {
			this.routeBlock = block;
			this.routes = block.length
				? defaultBlockRoutes(this.cells, block)
				: { inbound: [], outbound: [] };
		}
		return this.routes;
	}
}
