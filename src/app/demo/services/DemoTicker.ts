import type { WarehouseStore } from "../runtime/warehouseStore";
import { type SimulationContext, systemContext } from "../simulation/context";
import { stepWarehouse } from "../simulation/stepWarehouse";

export class DemoTicker {
	private timer: ReturnType<typeof setInterval> | null = null;
	constructor(
		private readonly store: WarehouseStore,
		private readonly intervalMs = 500,
		private readonly context: SimulationContext = systemContext,
	) {}
	start() {
		if (this.timer !== null) return;
		this.timer = setInterval(() => this.advance(), this.intervalMs);
	}
	stop() {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
	advance() {
		const updated = [];
		for (const id of this.store.runningWarehouseIds()) {
			const draft = this.store.getWarehouse(id);
			if (!draft) continue;
			stepWarehouse(draft, this.context);
			updated.push(draft);
		}
		if (updated.length) this.store.saveWarehouses(updated);
	}
}
