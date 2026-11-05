import { ApiError } from "@/shared/api";
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

function requireValue<T>(value: T | undefined, field: string): T {
	if (value === undefined)
		throw new ApiError(`Сервер не вернул ${field}`, 502, "INVALID_RESPONSE");
	return value;
}

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
			capacity: cell ? Number(cell.capacity_volume) : undefined,
			zone: cell?.zone,
		};
	});
}

export function warehouseFromDto(d: WarehouseDto): Warehouse {
	return {
		id: d.id,
		cabinet: d.cabinet_settings,
		writeOffs: d.write_offs,
		allowedActions: d.allowed_actions,
		summary: d.summary,
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
			: {
					confirmUnload: false,
					confirmPick: false,
					confirmPutaway: false,
					confirmLoad: false,
				},
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
		number: o.number ?? "—",
		quantity: o.quantity,
		kind: o.kind,
		party: o.counterparty_text,
		status: o.status,
		created: o.created_at,
		manual: policyFromDto(o.confirmations || o),
		allowedActions: o.allowed_actions,
		blockedReason: o.blocked_reason,
		tasks: o.tasks,
		stage: o.stage,
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
	position?: MapStateDto["robots"][number] | undefined,
): Robot {
	return {
		id: r.id,
		allowedActions: r.allowed_actions,
		blockedReason: r.blocked_reason,
		currentTask: r.current_task,
		returnRoute: r.return_route,
		motionPath: position?.motion_path ?? r.motion_path,
		revision: r.revision,
		name: r.name,
		roles: requireValue(r.roles ?? r.specializations, "roles"),
		x: position?.x ?? r.x,
		y: position?.y ?? r.y,
		speed: requireValue(r.speed ?? r.speed_cells_per_tick, "speed"),
		duration: r.action_ticks,
		capacity: String(r.capacity_volume),
		status: position?.status || r.status,
	};
}

export function categoryFromDto(c: CategoryDto): Category {
	return {
		id: c.id,
		allowedActions: c.allowed_actions,
		productCount: c.product_count,
		revision: c.revision,
		name: c.name,
		cold: c.storage_kind === "cold",
		archived: c.is_archived || !!c.archived_at,
	};
}

export function productFromDto(p: ProductDto): Product {
	return {
		id: p.id,
		allowedActions: p.allowed_actions,
		revision: p.revision,
		name: p.name,
		sku: p.sku,
		category: p.category_id,
		volume: String(
			requireValue(p.unit_volume ?? p.volume_per_unit, "unit_volume"),
		),
		price: p.price === null ? "" : String(p.price),
		shelf:
			requireValue(
				p.default_shelf_life_days !== undefined
					? p.default_shelf_life_days
					: p.standard_shelf_life_days,
				"default_shelf_life_days",
			) ?? 0,
		archived: p.is_archived || !!p.archived_at,
	};
}

export function stockFromDto(s: StockDto): Stock {
	return {
		availableQuantity: s.available_quantity,
		writeOffBlockedReason: s.write_off_blocked_reason,
		isExpired: s.is_expired,
		canWriteOff: s.can_write_off,
		id: s.id,
		revision: s.revision,
		batchId: s.batch_id,
		cellId: s.cell_id,
		product: s.product_id,
		quantity: s.quantity,
		reserved: s.reserved_quantity,
		expires: s.expires_on || "",
		cell: s.robot_id ? `robot:${s.robot_id}` : `${s.cell_x},${s.cell_y}`,
	};
}

export function eventFromDto(e: EventDto): Event {
	return {
		id: String(e.id),
		type: e.event_type,
		entity: e.entity_locator,
		time: e.created_at,
		title: e.message || e.event_type || "Событие",
		detail: e.detail || e.entity_locator || "",
	};
}
