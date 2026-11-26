import type {
	Category,
	Cell,
	Event,
	Order,
	Product,
	Robot,
	Stock,
	Warehouse,
} from "@/domain/warehouse";
import { cellKey, cellTypeSchema } from "@/domain/warehouse/layout";
import { ApiError } from "@/shared/http";
import type { CategoryDto, ProductDto } from "../catalog/catalogDto";
import { policyFromDto, wireKinds } from "../contracts/contractMappers";
import type { EventDto } from "../history/historyDto";
import type { StockDto } from "../inventory/inventoryDto";
import type { LayoutDto, MapStateDto } from "../layout/layout.dto.ts";
import type { OrderDto } from "../orders/orderDto";
import type { RobotDto } from "../robots/robotDto";
import type { WarehouseDto } from "../warehouses/warehouseDto";

const cellTypesByKind = new Map(
	cellTypeSchema.options.map(({ value }) => [wireKinds[value], value]),
);

function requireValue<T>(value: T | undefined, field: string): T {
	if (value === undefined)
		throw new ApiError(`Сервер не вернул ${field}`, 502, "INVALID_RESPONSE");
	return value;
}

export function cellsFromDto(layout: LayoutDto): Cell[] {
	const cells = new Map(layout.cells.map((cell) => [cellKey(cell), cell]));

	return Array.from({ length: layout.width * layout.height }, (_, index) => {
		const x = index % layout.width;
		const y = Math.floor(index / layout.width);
		const cell = cells.get(cellKey({ x, y }));

		return {
			x,
			y,
			type: cell
				? requireValue(cellTypesByKind.get(cell.kind), "kind")
				: "empty",
			capacity: cell ? Number(cell.capacity_volume) : undefined,
			zone: cell?.zone,
		};
	});
}

export function warehouseFromDto(dto: WarehouseDto): Warehouse {
	return {
		id: dto.id,
		cabinet: dto.cabinet_settings,
		writeOffs: dto.write_offs,
		allowedActions: dto.allowed_actions,
		summary: dto.summary,
		name: dto.name,
		location: "",
		width: dto.width,
		height: dto.height,
		timezone: dto.time_zone,
		revision: dto.revision,
		version: dto.published_version || 0,
		published: !!dto.published_version,
		running: dto.simulation_mode === "running",
		workerHealth: dto.worker_health,
		stateVersion: String(dto.state_version),
		asOf: dto.as_of,
		lastTickAt: dto.last_tick_at,
		tick: String(dto.tick),
		policy: dto.workflow_policy
			? policyFromDto(dto.workflow_policy)
			: {
					confirmUnload: false,
					confirmPick: false,
					confirmPutaway: false,
					confirmLoad: false,
				},
		policyRevision: dto.workflow_policy?.revision,
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

export function orderFromDto(dto: OrderDto): Order {
	return {
		id: dto.id,
		revision: dto.revision,
		number: dto.number,
		quantity: dto.quantity,
		kind: dto.kind,
		party: dto.counterparty_text,
		status: dto.status,
		created: dto.created_at,
		manual: policyFromDto(dto.confirmations || dto),
		allowedActions: dto.allowed_actions,
		blockedReason: dto.blocked_reason,
		tasks: dto.tasks,
		stage: dto.stage,
		lines: dto.lines.map((line) => ({
			id: line.id,
			product: line.product_id,
			quantity: line.quantity,
			expires: line.expires_on || "",
			putaway: line.placed_quantity ?? line.putaway_quantity,
			writtenOff: line.lost_quantity ?? line.written_off_quantity,
		})),
	};
}

export function robotFromDto(
	dto: RobotDto,
	position?: MapStateDto["robots"][number] | undefined,
): Robot {
	return {
		id: dto.id,
		allowedActions: dto.allowed_actions,
		blockedReason: dto.blocked_reason,
		currentTask: dto.current_task,
		returnRoute: dto.return_route,
		motionPath: position?.motion_path ?? dto.motion_path,
		revision: dto.revision,
		name: dto.name,
		roles: requireValue(dto.roles ?? dto.specializations, "roles"),
		x: position?.x ?? dto.x,
		y: position?.y ?? dto.y,
		speed: requireValue(dto.speed ?? dto.speed_cells_per_tick, "speed"),
		duration: dto.action_ticks,
		capacity: String(dto.capacity_volume),
		status: position?.status || dto.status,
	};
}

export function categoryFromDto(dto: CategoryDto): Category {
	return {
		id: dto.id,
		allowedActions: dto.allowed_actions,
		productCount: dto.product_count,
		revision: dto.revision,
		name: dto.name,
		cold: dto.storage_kind === "cold",
		archived: dto.is_archived || !!dto.archived_at,
	};
}

export function productFromDto(dto: ProductDto): Product {
	return {
		id: dto.id,
		allowedActions: dto.allowed_actions,
		revision: dto.revision,
		name: dto.name,
		sku: dto.sku,
		category: dto.category_id,
		volume: String(
			requireValue(dto.unit_volume ?? dto.volume_per_unit, "unit_volume"),
		),
		price: dto.price === null ? "" : String(dto.price),
		shelf:
			requireValue(
				dto.default_shelf_life_days !== undefined
					? dto.default_shelf_life_days
					: dto.standard_shelf_life_days,
				"default_shelf_life_days",
			) ?? 0,
		archived: dto.is_archived || !!dto.archived_at,
	};
}

export function stockFromDto(dto: StockDto): Stock {
	const source = dto.source_order;

	return {
		availableQuantity: dto.available_quantity,
		writeOffBlockedReason: dto.write_off_blocked_reason,
		isExpired: dto.is_expired,
		canWriteOff: dto.can_write_off,
		id: dto.id,
		revision: dto.revision,
		batchId: dto.batch_id,
		sourceOrderId: source?.id ?? dto.source_order_id ?? undefined,
		sourceOrder: source
			? {
					id: source.id,
					number: source.number,
					party: source.counterparty_text,
				}
			: undefined,
		cellId: dto.cell_id,
		product: dto.product_id,
		quantity: dto.quantity,
		reserved: dto.reserved_quantity,
		expires: dto.expires_on || "",
		cell: dto.robot_id
			? `robot:${dto.robot_id}`
			: `${dto.cell_x},${dto.cell_y}`,
	};
}

export function eventFromDto(dto: EventDto): Event {
	return {
		id: String(dto.id),
		warehouseId:
			dto.warehouse_id ??
			/^warehouses?[:/]([^/]+)$/.exec(dto.entity_locator ?? "")?.[1],
		type: dto.event_type,
		entity: dto.entity_locator,
		time: dto.created_at,
		title: dto.message || dto.event_type || "Событие",
		detail: dto.detail || dto.entity_locator || "",
	};
}
