import type { ProductDto } from "../src/app/modules/warehouse-data/api/catalog/catalogDto";
import type { OrderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";
import type { WarehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import { warehouseDay } from "../src/app/modules/warehouse/warehouse-information/model/reportPeriod";
import {
	type WorkingShipment,
	workingShipmentSchema,
} from "../src/app/modules/warehouse/shipment-management/api/shipment.dto";

export const counterparties = [
	{ name: "ООО «Северный путь»", address: "Тверь, Промышленный проезд, 8" },
	{
		name: "ООО «Ладога Маркет»",
		address: "Санкт-Петербург, проспект Обуховской Обороны, 120",
	},
	{ name: "ООО «Вектор Логистика»", address: "Казань, ул. Восстания, 100" },
	{ name: "ООО «Точка Снабжения»", address: "Самара, Заводское шоссе, 111" },
	{
		name: "ООО «Городской резерв»",
		address: "Нижний Новгород, ул. Вторчермета, 1",
	},
	{
		name: "ООО «Атлас Комплект»",
		address: "Екатеринбург, ул. Монтажников, 24",
	},
];

const counterpartyAddresses = new Map([
	...counterparties.map(({ name, address }) => [name, address] as const),
	["Интернет-заказ #2087", "Казань, ул. Техническая, 17"],
	["ИП Волкова", "Рязань, ул. Ситниковская, 69"],
	["ООО «Балтийская доставка»", "Псков, ул. Леона Поземского, 123"],
	["ИП Лебедева", "Великий Новгород, ул. Рабочая, 31"],
	["ООО «Северная упаковка»", "Санкт-Петербург, ул. Софийская, 72"],
]);

export function sampleShipment(
	warehouse: WarehouseDto,
	order: OrderDto,
	products: ProductDto[],
): WorkingShipment {
	const location = warehouse.cabinet_settings?.location;
	const addressParts = [warehouse.name, location].filter(Boolean);
	const warehouseAddress = addressParts.join(", ");
	const counterpartyAddress = counterpartyAddresses.get(
		order.counterparty_text,
	);
	const isInbound = order.kind === "inbound";
	const route = {
		origin_address:
			(isInbound ? counterpartyAddress : warehouseAddress) ?? null,
		destination_address:
			(isInbound ? warehouseAddress : counterpartyAddress) ?? null,
	};

	const items = (order.lines ?? []).map((line, index) => {
		const product = products.find(({ id }) => id === line.product_id);
		return {
			order_line_id: line.id ?? `${order.id}-line-${index + 1}`,
			sku: product?.sku ?? line.product_id,
			name: product?.name ?? line.product_id,
			quantity: line.quantity,
			unit: "pcs",
			grade: null,
			packaging: null,
			variant: null,
		};
	});
	const created = Date.parse(order.created_at);
	const hour = (offset: number) =>
		new Date(created + offset * 3600000).toISOString();
	const state =
		{
			completed: "delivered",
			received: "delivered",
			received_with_losses: "delivered",
			cancelled: "cancelled",
			draft: "on_hold",
			blocked: "on_hold",
			aborting: "on_hold",
		}[order.status] ?? "active";
	const stages = [
		["accepted", 0],
		["warehouse_preparation", 2],
		["ready_to_ship", 5],
		["loading", 6],
		["handed_to_carrier", 7],
		["in_transit", 8],
		["delivered", 28],
	] as const;
	const current =
		{
			completed: stages.length,
			received: stages.length,
			received_with_losses: stages.length,
			shipped: 5,
			awaiting_load: 3,
			waiting_confirmation: 2,
			active: 1,
			in_progress: 1,
		}[order.status] ?? 0;
	const hasDeparted = current > 4;
	const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
	return workingShipmentSchema.parse({
		order: {
			number: order.number ?? order.id,
			recipient: isInbound ? warehouse.name : order.counterparty_text,
			warehouse_name: warehouse.name,
			time_zone: warehouse.time_zone,
			created_at: hour(0),
			updated_at: hour(stages[Math.min(current, stages.length - 1)]?.[1] ?? 0),
			state,
			status_reason:
				state === "on_hold"
					? "Ожидает подтверждения заказа"
					: (order.blocked_reason ?? null),
		},
		route,
		warehouse: {
			priority: current === 2 ? "high" : "normal",
			quantities: [
				{
					unit: "pcs",
					ready_quantity: current >= 2 && !hasDeparted ? quantity : 0,
					processing_quantity: current === 1 ? quantity : 0,
					remaining_quantity:
						hasDeparted || state === "cancelled" ? 0 : quantity,
				},
			],
		},
		items,
		plan:
			state === "cancelled"
				? []
				: items.map((item) => ({
						date: warehouseDay(hour(7), warehouse.time_zone),
						order_line_id: item.order_line_id,
						quantity: item.quantity,
						unit: item.unit,
					})),
		actual: hasDeparted
			? items.map((item) => ({
					id: `dispatch-${item.order_line_id}`,
					order_line_id: item.order_line_id,
					quantity: item.quantity,
					unit: item.unit,
					packaging: null,
					shipped_at: hour(7),
					loaded_at: hour(6),
					transport_type: "road",
					vehicle_number: "М407КР 77",
					reference_number: `ТН-${order.number}`,
					comment: null,
				}))
			: [],
		milestones: stages.map(([code, offset], index) => ({
			code,
			state:
				index < current
					? "completed"
					: index === current && state === "active"
						? "current"
						: "pending",
			occurred_at:
				index <= current && state !== "on_hold" && state !== "cancelled"
					? hour(offset)
					: null,
			planned_at: index > current && state === "active" ? hour(offset) : null,
			note: null,
		})),
		documents: [],
		allowed_actions: isInbound ? [] : ["manage-all-links"],
		revision: 0,
		share_link: null,
	});
}
