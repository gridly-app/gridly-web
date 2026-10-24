import type { DemoRuntime } from "@/app/demo";
import type { WarehouseRepository } from "@/entities/warehouse";
import type { DemoSession } from "@/shared/auth";
import type { KeyValueStorage } from "@/shared/lib";

export class DemoSessionController implements DemoSession {
	private runtime: DemoRuntime | null = null;

	private generation = 0;

	readonly repository: WarehouseRepository = {
		networkMode: "always",
		list: async (signal) => this.current().list(signal),
		get: async (id, signal) => this.current().get(id, signal),
		getLive: async (id, signal) => this.current().getLive(id, signal),
		create: async (warehouse) => this.current().create(warehouse),
		execute: async (id, command) => this.current().execute(id, command),
	};

	constructor(
		private readonly storage: KeyValueStorage,
		private readonly loadRuntime = () => import("@/app/demo"),
	) {}

	active() {
		return this.storage.getItem("gridly.demo") === "true";
	}

	async start() {
		const generation = ++this.generation;
		const { DemoRuntime } = await this.loadRuntime();

		if (generation !== this.generation) {
			throw new DOMException("Запуск песочницы отменён", "AbortError");
		}
		const runtime = new DemoRuntime();

		try {
			runtime.start();
			this.storage.setItem("gridly.demo", "true");
		} catch (error) {
			runtime.stop();
			throw error;
		}
		this.runtime?.stop();
		this.runtime = runtime;
	}

	async stop() {
		this.generation++;
		this.runtime?.stop();
		this.runtime = null;
		this.storage.removeItem("gridly.demo");
	}

	private current() {
		if (!this.runtime) {
			throw new Error("Сначала откройте песочницу");
		}

		return this.runtime;
	}
}
