import type { z } from "zod";

import { auditCollectionSchema } from "../src/app/modules/audit/api/audit.dto";
import { systemSchema } from "../src/app/modules/system/api/system.dto";
import type { orderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";
import type { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import { workingShipmentSchema } from "../src/app/modules/warehouse/shipment-management/api/shipment.dto";
import type { AuditEvent } from "../src/domain/shipment";

import { base, type MockStore } from "./mock-http";

const components = [
	["api", "Сервис отгрузок", "ok", 0],
	["warehouse", "Складской сервис", "ok", 1],
	["stream", "Обновления в реальном времени", "degraded", 22],
	["documents", "Хранилище документов", "ok", 2],
	["notifications", "Доставка уведомлений", "unavailable", null],
] as const;
const systemErrors = [
	{
		message: "Поток склада переключился на периодический опрос.",
		component: "stream",
	},
	{
		message: "Уведомление о готовности не доставлено.",
		component: "notifications",
		event: "notification.sent",
		area: "outbound",
	},
	{
		message: "Не удалось передать статус отгрузки.",
		component: "api",
		event: "shipment.status.synced",
		area: "outbound",
	},
	{
		message: "Не удалось подтвердить поставку.",
		component: "warehouse",
		event: "inbound.confirmed",
		area: "inbound",
	},
	{
		message: "Не удалось сохранить карту склада.",
		component: "warehouse",
		event: "warehouse.map.saved",
		area: "map",
	},
] as const;
const jobNames = [
	"Обновление снимков",
	"Отправка уведомлений",
	"Архивация ссылок",
	"Сводка отгрузок",
	"Проверка документов",
];
const jobStatuses = ["running", "failed", "completed", "pending", "completed"];

export function seedMonitoring(
	store: MockStore,
	prefix: string,
	template: z.infer<typeof warehouseDto>,
	orders: z.infer<typeof orderDto>[],
	date: (minutesAgo: number) => string,
) {
	const primaryPath = `${base}/warehouses/${template.id}`;

	const auditPath = `${base}${prefix}/admin/shipment-audit`;
	const audit = auditCollectionSchema.parse(store.get(auditPath));
	const actor = prefix
		? {
				actor_id: "sandbox-operator",
				actor_name: "Оператор песочницы",
				source: "sandbox",
			}
		: {
				actor_id: "user-sandbox-admin",
				actor_name: "Анна Смирнова",
				source: "account",
			};
	const sampleOrders = orders.filter(({ id }) =>
		id.startsWith("order-sample-"),
	);
	const latest = sampleOrders.slice(0, 12);
	const events: AuditEvent[] = latest.map((order) => ({
		...actor,
		id: `audit-${order.id}`,
		occurred_at: order.created_at,
		event_type: "order.created",
		result: "success",
		area: order.kind,
		warehouse_id: template.id,
		warehouse_name: template.name,
		time_zone: template.time_zone,
		order_id: order.id,
		...(order.number && { order_number: order.number }),
		correlation_id: `creation-${order.id}`,
		changes: [],
	}));
	const recentErrors = systemErrors.map(({ message, component }, index) => ({
		occurred_at: date(3 + index * 8),
		message,
		component,
		component_name: components.find(([code]) => code === component)?.[1],
		correlation_id: crypto.randomUUID(),
		retry_state: index % 2 ? "Ожидает повтора" : "Повтор запущен",
	}));
	const inbound = orders.find(({ kind }) => kind === "inbound");
	const shipmentOrder = orders.find(({ id }) => id === "order-out-2087");
	recentErrors.forEach((error, index) => {
		const sample = systemErrors[index];
		if (!sample || !("event" in sample)) return;
		const order =
			sample.area === "outbound"
				? shipmentOrder
				: sample.area === "inbound"
					? inbound
					: undefined;
		const isSystem = sample.event === "notification.sent";
		events.push({
			id: crypto.randomUUID(),
			correlation_id: error.correlation_id,
			occurred_at: error.occurred_at,
			event_type: sample.event,
			area: sample.area,
			result: "failure",
			...(isSystem
				? { actor_id: null, actor_name: null, source: "system" }
				: actor),
			warehouse_id: template.id,
			warehouse_name: template.name,
			time_zone: template.time_zone,
			order_id: order?.id ?? null,
			order_number: order?.number ?? null,
			changes: [],
		});
	});
	const items = [...audit.items, ...events].sort((left, right) =>
		right.occurred_at.localeCompare(left.occurred_at),
	);
	store.set(auditPath, { items, total: items.length });

	const systemPath = `${base}${prefix}/admin/shipment-system`;
	const system = systemSchema.parse(store.get(systemPath));
	const shipment = workingShipmentSchema.parse(
		store.get(`${primaryPath}/orders/order-out-2087/shipment`),
	);
	store.set(systemPath, {
		...system,
		order_diagnostics: {
			warehouse_id: template.id,
			warehouse_name: template.name,
			time_zone: template.time_zone,
			order_id: "order-out-2087",
			order_number: shipment.order.number,
			updated_at: shipment.order.updated_at,
			recent_events: items.filter(
				({ order_id }) => order_id === "order-out-2087",
			),
		},
		checked_at: date(0),
		components: components.map(([code, name, status, lag_seconds]) => ({
			code,
			name,
			status,
			lag_seconds,
			last_success_at: date(status === "ok" ? 0 : 18),
		})),
		error_count: recentErrors.length,
		recent_errors: recentErrors,
		jobs: jobNames.map((name, index) => ({
			id: `job-${index + 1}`,
			name,
			type: "background",
			status: jobStatuses[index],
			started_at: jobStatuses[index] === "pending" ? null : date(4 + index * 5),
		})),
	});
}
