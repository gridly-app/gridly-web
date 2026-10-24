import {
	ApiError,
	type HttpClient,
	parseResponse,
	type RequestOptions,
} from "@/shared/api";
import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse/schemas";
import { RestWarehouseCommands } from "../commands/restCommands";
import {
	categoryDto,
	createdDto,
	eventDto,
	type LayoutDto,
	layoutDto,
	orderDto,
	productDto,
	robotDto,
	stockDto,
	warehouseDto,
} from "../contracts/contract";
import { readMapState } from "./readMapState";
import { readWarehouseCollection } from "./readWarehouseCollection";
import type { WarehouseRepository } from "./repository";
import {
	categoryFromDto,
	cellsFromDto,
	eventFromDto,
	orderFromDto,
	productFromDto,
	robotFromDto,
	stockFromDto,
	warehouseFromDto,
} from "./restMappers";

export class RestWarehouseRepository implements WarehouseRepository {
	private layouts = new Map<string, LayoutDto>();

	private current = new Map<string, Warehouse>();

	private pendingKeys = new Map<string, string>();

	private generation = 0;

	constructor(private readonly http: HttpClient) {}

	clear() {
		this.generation++;
		this.layouts.clear();
		this.current.clear();
		this.pendingKeys.clear();
	}

	async getLive(id: string, signal?: AbortSignal) {
		const generation = this.generation;
		const warehouse = this.current.get(id);

		if (!warehouse) {
			throw new Error("Сначала загрузите склад");
		}
		const state = await readMapState(
			this.http,
			`/warehouses/${encodeURIComponent(id)}/map/state?after_version=${warehouse.stateVersion || "0"}`,
			{ signal },
		);

		this.assertActive(generation, signal);
		if (!state) {
			const latest = this.current.get(id) || warehouse;
			return {
				layoutVersion: latest.version,
				stateVersion: latest.stateVersion,
				tick: latest.tick,
				robots: latest.robots,
				asOf: latest.asOf,
			};
		}
		if (state.warehouse_id !== id) {
			throw new Error("Получен снимок другого склада");
		}
		const latest = this.current.get(id) || warehouse;

		if (state.layout_version !== latest.version) {
			throw new Error("Карта изменилась. Дождитесь повторной синхронизации.");
		}

		if (BigInt(state.state_version) < BigInt(latest.stateVersion || "0")) {
			return {
				layoutVersion: latest.version,
				stateVersion: latest.stateVersion,
				tick: latest.tick,
				robots: latest.robots,
				asOf: latest.asOf,
			};
		}
		const positions = new Map(state.robots.map((r) => [r.id, r]));
		const update = {
			layoutVersion: latest.version,
			stateVersion: String(state.state_version),
			tick: String(state.tick),
			asOf: state.as_of,
			robots: latest.robots.map((robot) => ({
				...robot,
				x: positions.get(robot.id)?.x ?? robot.x,
				y: positions.get(robot.id)?.y ?? robot.y,
				status: positions.get(robot.id)?.status || robot.status,
			})),
		};

		this.current.set(id, { ...latest, ...update });

		return update;
	}

	async getOrder(id: string, orderId: string, signal?: AbortSignal) {
		return orderFromDto(
			parseResponse(
				orderDto,
				await this.http.request(
					`/warehouses/${encodeURIComponent(id)}/orders/${encodeURIComponent(orderId)}`,
					{ signal },
				),
			),
		);
	}

	async list(signal?: AbortSignal) {
		return (
			await readWarehouseCollection(
				this.http,
				"/warehouses?include_summary=true",
				warehouseDto,
				signal,
			)
		).map(warehouseFromDto);
	}

	async get(id: string, signal?: AbortSignal): Promise<Warehouse> {
		const generation = this.generation;
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const d = parseResponse(
			warehouseDto,
			await this.http.request(base, { signal }),
		);

		this.assertActive(generation, signal);
		const warehouse = warehouseFromDto(d);
		const retainedLayout = this.layouts.get(id);
		const cachedLayout =
			retainedLayout?.version === warehouse.version
				? retainedLayout
				: undefined;
		const layoutPromise = warehouse.published
			? cachedLayout
				? Promise.resolve(cachedLayout)
				: this.http
						.request(`${base}/layout`, { signal })
						.then((data) => parseResponse(layoutDto, data))
			: Promise.resolve(null);
		const draftPromise = this.http
			.request(`${base}/layout/draft`, { signal })
			.then((data) => parseResponse(layoutDto, data))
			.catch((e) => {
				if (e instanceof ApiError && e.status === 404) {
					return null;
				}
				throw e;
			});
		const [
			layout,
			draft,
			state,
			robots,
			categories,
			products,
			orders,
			stock,
			events,
		] = await Promise.all([
			layoutPromise,
			draftPromise,
			readMapState(this.http, `${base}/map/state`, { signal }),
			readWarehouseCollection(this.http, `${base}/robots`, robotDto, signal),
			readWarehouseCollection(
				this.http,
				`${base}/categories?include_archived=true`,
				categoryDto,
				signal,
			),
			readWarehouseCollection(
				this.http,
				`${base}/products?include_archived=true`,
				productDto,
				signal,
			),
			readWarehouseCollection(this.http, `${base}/orders`, orderDto, signal),
			readWarehouseCollection(
				this.http,
				`${base}/inventory?include_robots=true`,
				stockDto,
				signal,
			),
			readWarehouseCollection(this.http, `${base}/events`, eventDto, signal),
		]);

		this.assertActive(generation, signal);
		if (!state || state.warehouse_id !== id) {
			throw new Error("Получен снимок другого склада");
		}
		if (layout && layout.version !== state.layout_version) {
			if (cachedLayout) this.layouts.delete(id);
			throw new Error("Карта изменилась. Повторите синхронизацию.");
		}
		if (!layout) {
			warehouse.cells = Array.from(
				{ length: warehouse.width * warehouse.height },
				(_, index) => ({
					x: index % warehouse.width,
					y: Math.floor(index / warehouse.width),
					type: "empty",
					capacity: 20,
				}),
			);
		}
		if (layout) {
			warehouse.cells = cellsFromDto(layout);
		}
		if (draft) {
			warehouse.draft = cellsFromDto(draft);
			warehouse.draftRevision = draft.revision;
		}
		warehouse.stateVersion = String(state.state_version);
		warehouse.tick = String(state.tick);
		warehouse.asOf = state.as_of || d.as_of;
		const live = new Map(state.robots.map((r) => [r.id, r]));

		warehouse.robots = robots.map((r) => robotFromDto(r, live.get(r.id)));
		warehouse.categories = categories.map(categoryFromDto);
		warehouse.products = products.map(productFromDto);
		warehouse.orders = await Promise.all(
			orders.map((order) =>
				order.lines
					? Promise.resolve(orderFromDto(order))
					: this.getOrder(id, order.id, signal),
			),
		);
		this.assertActive(generation, signal);
		warehouse.stock = stock.map(stockFromDto);
		warehouse.events = events.map(eventFromDto);
		const latest = this.current.get(id);
		if (latest && latest.version > warehouse.version) return latest;
		if (layout) this.layouts.set(id, layout);

		if (
			latest?.version === warehouse.version &&
			BigInt(latest.stateVersion || "0") > BigInt(warehouse.stateVersion || "0")
		) {
			warehouse.stateVersion = latest.stateVersion;
			warehouse.tick = latest.tick;
			warehouse.asOf = latest.asOf;
			const liveRobots = new Map(
				latest.robots.map((robot) => [robot.id, robot]),
			);

			warehouse.robots = warehouse.robots.map((robot) => {
				const live = liveRobots.get(robot.id);

				return live
					? { ...robot, x: live.x, y: live.y, status: live.status }
					: robot;
			});
		}
		this.current.set(id, warehouse);

		return warehouse;
	}

	private async mutate(
		path: string,
		options: RequestOptions,
		keyed = true,
	): Promise<unknown> {
		const generation = this.generation;
		const signature = JSON.stringify([path, options.method, options.body]);
		let key = this.pendingKeys.get(signature);

		if (keyed && !key) {
			key = crypto.randomUUID();
			this.pendingKeys.set(signature, key);
		}
		try {
			const result = await this.http.request(path, {
				...options,
				idempotencyKey: keyed ? key : undefined,
			});

			this.assertActive(generation, options.signal);
			this.pendingKeys.delete(signature);

			return result;
		} catch (error) {
			if (
				generation === this.generation &&
				error instanceof ApiError &&
				error.status < 500 &&
				error.status !== 429
			) {
				this.pendingKeys.delete(signature);
			}
			throw error;
		}
	}

	private assertActive(generation: number, signal?: AbortSignal) {
		signal?.throwIfAborted();
		if (generation !== this.generation) {
			throw new DOMException("Сессия склада завершена", "AbortError");
		}
	}

	async create(warehouse: Warehouse) {
		const result = parseResponse(
			createdDto,
			await this.mutate("/warehouses", {
				method: "POST",
				body: {
					name: warehouse.name,
					width: warehouse.width,
					height: warehouse.height,
					time_zone: warehouse.timezone,
				},
			}),
		);

		return this.get(result.id);
	}

	async execute(id: string, command: WarehouseCommand): Promise<Warehouse> {
		const warehouse = this.current.get(id);

		if (!warehouse) {
			throw new Error("Сначала синхронизируйте склад");
		}
		const commands = new RestWarehouseCommands(
			this.http,
			this.mutate.bind(this),
		);

		await commands.execute(id, command, warehouse);

		return this.get(id);
	}
}
