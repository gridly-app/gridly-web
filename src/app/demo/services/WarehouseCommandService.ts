import type {
	CommandPayloads,
	Warehouse,
	WarehouseCommand,
} from "@/entities/warehouse";
import type {
	CommandHandler,
	CommandHandlers,
} from "../commands/commandHandlers";
import { commandTitles } from "../commands/commandTitles";
import type { WarehouseStore } from "../runtime/warehouseStore";
import { type SimulationContext, systemContext } from "../simulation/context";

export class WarehouseCommandService {
	constructor(
		private readonly store: WarehouseStore,
		private readonly handlers: CommandHandlers,
		private readonly context: SimulationContext = systemContext,
	) {}

	execute(warehouseId: string, command: WarehouseCommand) {
		const warehouse = this.store.getWarehouse(warehouseId);

		if (!warehouse) {
			throw new Error("Склад не найден");
		}
		this.apply(warehouse, command.action, command.value);
		const detail =
			command.action === "zone"
				? command.value.zone.name
				: command.action === "writeoff"
					? command.value.reason
					: `Тик ${warehouse.tick} · ${warehouse.name}`;

		warehouse.events.unshift({
			id: this.context.nextId(),
			time: this.context.now().toISOString(),
			title: commandTitles[command.action],
			detail,
		});
		warehouse.stateVersion = String(
			BigInt(warehouse.stateVersion || warehouse.tick) + 1n,
		);
		warehouse.asOf = this.context.now().toISOString();
		warehouse.events = warehouse.events.slice(0, 200);
		this.store.saveWarehouse(warehouse);

		return warehouse;
	}

	private apply<K extends keyof CommandPayloads>(
		warehouse: Warehouse,
		action: K,
		value: CommandPayloads[K],
	) {
		const handler = this.handlers[action] as CommandHandler<K>;

		handler(warehouse, value, this.context);
	}
}
