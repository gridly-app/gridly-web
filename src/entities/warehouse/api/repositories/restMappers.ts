import type {
	Category,
	Cell,
	Event,
	Order,
	Product,
	Robot,
	Stock,
	Warehouse,
} from "../../model/warehouse/schemas";
import type {
	CategoryDto,
	EventDto,
	LayoutDto,
	MapStateDto,
	OrderDto,
	ProductDto,
	RobotDto,
	StockDto,
	WarehouseDto,
} from "../contracts/contract";
import { policyFromDto, wireKinds } from "../contracts/contractMappers";

export function cellsFromDto(layout: LayoutDto): Cell[] {
	const cells = new Map(
		(layout.cells || []).map((cell) => [`${cell.x},${cell.y}`, cell]),
	);

	return Array.from({ length: layout.width * layout.height }, (_, index) => {
		const x = index % layout.width;
		const y = Math.floor(index / layout.width);
		const cell = cells.get(`${x},${y}`);

		return {
			x,
			y,
			type: cell
				? (Object.keys(wireKinds) as Cell["type"][]).find(
						(kind) => wireKinds[kind] === cell.kind,
					) || "empty"
				: "empty",
			capacity: cell ? Number(cell.capacity_volume) : 20,
		};
	});
}

export function warehouseFromDto(d: WarehouseDto): Warehouse {
	return {
		id: d.id,
		name: d.name,
		location: "",
		width: d.width,
		height: d.height,
		timezone: d.time_zone,
		revision: d.revision,
		version: d.published_version || 0,
		published: !!d.published_version,
		running: d.simulation_mode === "running",
		workerHealth: d.worker_health,
		stateVersion: String(d.state_version),
		asOf: d.as_of,
		lastTickAt: d.last_tick_at,
		tick: String(d.tick),
		policy: d.workflow_policy
			? policyFromDto(d.workflow_policy)
			: [false, false, false, false],
		policyRevision: d.workflow_policy?.revision,
		cells: [],
		draft: null,
		robots: [],
		categories: [],
		products: [],
		stock: [],
		orders: [],
		events: [],
	};
}

export function orderFromDto(o: OrderDto): Order {
	return {
		id: o.id,
		revision: o.revision,
		number: o.number || o.id.slice(0, 8).toUpperCase(),
		kind: o.kind,
		party: o.counterparty_text,
		status: o.status,
		created: o.created_at,
		manual: policyFromDto(o.confirmations || o),
		allowedActions: o.allowed_actions,
		blockedReason: o.blocked_reason,
		tasks: o.tasks,
		stage:
			o.status === "draft"
				? 0
				: ["received", "received_with_losses", "shipped"].includes(o.status)
					? 3
					: 2,
		lines: (o.lines || []).map((l) => ({
			id: l.id,
			product: l.product_id,
			quantity: l.quantity,
			expires: l.expires_on || "",
			putaway: l.placed_quantity ?? l.putaway_quantity,
			writtenOff: l.lost_quantity ?? l.written_off_quantity,
		})),
	};
}

export function robotFromDto(
	r: RobotDto,
	position?: MapStateDto["robots"][number],
): Robot {
	return {
		id: r.id,
		revision: r.revision,
		name: r.name,
		roles: r.roles || r.specializations || [],
		x: position?.x ?? r.x,
		y: position?.y ?? r.y,
		speed: r.speed ?? r.speed_cells_per_tick ?? 1,
		duration: r.action_ticks,
		capacity: String(r.capacity_volume),
		status: position?.status || r.status,
	};
}

export function categoryFromDto(c: CategoryDto): Category {
	return {
		id: c.id,
		revision: c.revision,
		name: c.name,
		cold: c.storage_kind === "cold",
		archived: c.is_archived || !!c.archived_at,
	};
}

export function productFromDto(p: ProductDto): Product {
	return {
		id: p.id,
		revision: p.revision,
		name: p.name,
		sku: p.sku,
		category: p.category_id,
		volume: String(p.unit_volume ?? p.volume_per_unit ?? 0),
		price: p.price === null ? "" : String(p.price),
		shelf: p.default_shelf_life_days ?? p.standard_shelf_life_days ?? 0,
		archived: p.is_archived || !!p.archived_at,
	};
}

export function stockFromDto(s: StockDto): Stock {
	return {
		id: s.id,
		revision: s.revision,
		batchId: s.batch_id,
		cellId: s.cell_id,
		product: s.product_id,
		quantity: s.quantity,
		reserved: s.reserved_quantity ?? 0,
		expires: s.expires_on || "",
		cell: s.robot_id ? `robot:${s.robot_id}` : `${s.cell_x},${s.cell_y}`,
	};
}

export function eventFromDto(e: EventDto): Event {
	return {
		id: String(e.id),
		time: e.created_at,
		title: e.message || e.event_type || "Событие",
		detail: e.detail || e.entity_locator || "",
	};
}
