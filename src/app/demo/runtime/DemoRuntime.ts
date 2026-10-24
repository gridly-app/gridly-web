import type {
	Warehouse,
	WarehouseCommand,
	WarehouseRepository,
} from "@/entities/warehouse";
import { commandHandlers } from "../commands";
import { seed } from "../fixtures/seed";
import { DemoTicker } from "../services/DemoTicker";
import { WarehouseCommandService } from "../services/WarehouseCommandService";
import { type SimulationContext, systemContext } from "../simulation/context";
import { DemoWarehouseStore } from "./DemoWarehouseStore";
import type { DemoFixture } from "./warehouseStore";

export class DemoRuntime implements WarehouseRepository {
	readonly networkMode = "always";

	private readonly store: DemoWarehouseStore;

	private readonly commands: WarehouseCommandService;

	private readonly ticker: DemoTicker;

	private active = false;

	constructor(
		createFixture?: () => DemoFixture,
		context: SimulationContext = systemContext,
	) {
		this.store = new DemoWarehouseStore(createFixture || (() => seed(context)));
		this.commands = new WarehouseCommandService(
			this.store,
			commandHandlers,
			context,
		);
		this.ticker = new DemoTicker(this.store, 500, context);
	}

	start() {
		this.active = true;
		this.ticker.start();
	}

	stop() {
		this.active = false;
		this.ticker.stop();
	}

	async list(signal?: AbortSignal) {
		this.assertActive(signal);

		return this.store.listWarehouses();
	}

	async get(id: string, signal?: AbortSignal) {
		this.assertActive(signal);
		const warehouse = this.store.getWarehouse(id);

		if (!warehouse) {
			throw new Error("Склад песочницы не найден");
		}

		return warehouse;
	}

	async getLive(id: string, signal?: AbortSignal) {
		this.assertActive(signal);
		const live = this.store.getLive(id);
		if (!live) throw new Error("Склад песочницы не найден");
		return live;
	}

	async create(warehouse: Warehouse) {
		this.assertActive();
		this.store.saveWarehouse(warehouse);

		return this.get(warehouse.id);
	}

	async execute(id: string, command: WarehouseCommand) {
		this.assertActive();

		return this.commands.execute(id, command);
	}

	private assertActive(signal?: AbortSignal) {
		signal?.throwIfAborted();
		if (!this.active) {
			throw new DOMException("Песочница закрыта", "AbortError");
		}
	}
}
