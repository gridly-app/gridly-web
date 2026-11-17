import { z } from "zod";
import {
	categoryDto,
	productDto,
} from "../src/app/modules/warehouse-data/catalog/catalogDto";
import { eventDto } from "../src/app/modules/warehouse-data/history/historyDto";
import { stockDto } from "../src/app/modules/warehouse-data/inventory/inventoryDto";
import { layoutDto } from "../src/app/modules/warehouse-data/layout/layout.dto";
import { orderDto } from "../src/app/modules/warehouse-data/orders/orderDto";
import { robotDto } from "../src/app/modules/warehouse-data/robots/robotDto";
import { warehouseDto } from "../src/app/modules/warehouse-data/warehouses/warehouseDto";
import { type AuditEvent } from "../src/domain/shipment";
import { auditSchema } from "../src/app/modules/audit/api/audit.dto";
import { systemSchema } from "../src/app/modules/system/api/system.dto";
import { usersSchema } from "../src/app/modules/users/api/users.dto";
import { workingShipmentSchema } from "../src/app/modules/warehouse/shipment-management/model/shipment.dto";
import type { MockStore } from "./admin-mock";
import { recentOrders } from "./order-samples";
import { sampleShipment } from "./shipment-samples";

const base = "/api/v1";
const primaryPath = `${base}/warehouses/warehouse-demo`;
const warehouseList = z.object({ items: z.array(warehouseDto) });
const collection = <T extends z.ZodType>(
	schema: T,
	store: MockStore,
	path: string,
) => z.object({ items: z.array(schema) }).parse(store.get(path)).items;

const extraWarehouses = [
	[
		"warehouse-east",
		"Восточный склад",
		"Казань",
		"Казань, ул. Родины, 26",
		"Europe/Moscow",
	],
	[
		"warehouse-volga",
		"Волжский склад",
		"Самара",
		"Самара, ул. Кабельная, 1",
		"Europe/Samara",
	],
	[
		"warehouse-ural",
		"Уральский склад",
		"Екатеринбург",
		"Екатеринбург, ул. Черняховского, 86",
		"Asia/Yekaterinburg",
	],
] as const;

const productsByCategory = [
	{
		id: "cat-packaging",
		name: "Упаковка",
		products: ["Крафтовый пакет", "Короб для отправлений"],
	},
	{
		id: "cat-office",
		name: "Канцелярия",
		products: ["Маркер складской", "Этикетки для принтера"],
	},
];

const accountNames = [
	"Мария Волкова",
	"Артём Лебедев",
	"Дарья Орлова",
	"Никита Козлов",
	"Елена Соколова",
];
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

const permissionCatalog = [
	{ code: "warehouse.view", label: "Сводка склада", group: "Просмотр" },
	{ code: "warehouse.catalog.view", label: "Каталог", group: "Просмотр" },
	{ code: "warehouse.inventory.view", label: "Остатки", group: "Просмотр" },
	{ code: "warehouse.map.view", label: "Карта склада", group: "Просмотр" },
	{ code: "warehouse.robots.view", label: "Роботы", group: "Просмотр" },
	{
		code: "warehouse.orders.view",
		label: "Поставки и отгрузки",
		group: "Просмотр",
	},
	{
		code: "warehouse.history.view",
		label: "История операций",
		group: "Просмотр",
	},
	{
		code: "warehouse.manage",
		label: "Управление складом",
		group: "Управление",
	},
	{
		code: "shipment.manage",
		label: "Управление отгрузками",
		group: "Управление",
	},
	{ code: "shipment.audit", label: "Просмотр аудита", group: "Мониторинг" },
];

export function seedWorkspaceSamples(store: MockStore, now = Date.now()) {
	const date = (minutesAgo: number) =>
		new Date(now - minutesAgo * 60000).toISOString();
	const warehousePath = `${base}/warehouses`;
	const warehouses = warehouseList.parse(store.get(warehousePath)).items;
	for (const [index, warehouse] of warehouses.entries()) {
		warehouses[index] = warehouseDto.parse(
			store.get(`${warehousePath}/${warehouse.id}`),
		);
	}
	const template = warehouses.find(({ id }) => id === "warehouse-demo");
	if (!template?.cabinet_settings)
		throw new Error("Нет примера настроек Центрального склада");

	for (const [id, name, city, location, time_zone] of extraWarehouses) {
		const path = `${warehousePath}/${id}`;
		const warehouse = {
			...template,
			id,
			name,
			time_zone,
			cabinet_settings: { ...template.cabinet_settings, location },
			write_offs: [],
		};
		warehouses.push(warehouse);
		for (const [key, value] of [...store]) {
			if (!key.startsWith(`${primaryPath}/`) || key.includes("/orders/"))
				continue;
			if (key === `${primaryPath}/events`) continue;
			const copy = structuredClone(value);
			if (copy && typeof copy === "object" && "warehouse_id" in copy)
				copy.warehouse_id = id;
			store.set(path + key.slice(primaryPath.length), copy);
		}
		store.set(path, warehouse);
		const settings = store.get(`${path}/settings`);
		if (settings && typeof settings === "object" && "location" in settings)
			settings.location = city;
		store.set(`${path}/events`, {
			items: [
				{
					id: `event-${id}-created`,
					created_at: date(61 * 1440),
					event_type: "warehouse.created",
					entity_locator: `warehouse:${id}`,
					message: "Склад создан",
					detail: name,
				},
			],
		});
	}

	for (const [warehouseIndex, warehouse] of warehouses.entries()) {
		const path = `${warehousePath}/${warehouse.id}`;
		const products = collection(productDto, store, `${path}/products`);
		const categories = collection(categoryDto, store, `${path}/categories`);
		const stock = collection(stockDto, store, `${path}/inventory`);
		const robots = collection(robotDto, store, `${path}/robots`);
		const layout = layoutDto.parse(store.get(`${path}/layout`));
		const freeShelves = layout.cells.filter(
			(cell) =>
				cell.kind === "storage_general" &&
				!stock.some((item) => item.cell_x === cell.x && item.cell_y === cell.y),
		);
		const originalOrders =
			warehouseIndex < 2 ? collection(orderDto, store, `${path}/orders`) : [];
		for (const category of productsByCategory) {
			const existingCategory = categories.find(
				({ name }) => name === category.name,
			);
			const categoryId = existingCategory?.id ?? category.id;
			if (!existingCategory)
				categories.push({
					id: categoryId,
					name: category.name,
					storage_kind: "general",
					is_archived: false,
					revision: 1,
					product_count: category.products.length,
					allowed_actions: [],
				});
			for (const [index, name] of category.products.entries()) {
				const id = `prod-${category.id}-${index + 1}`;
				products.push({
					id,
					name,
					sku: `${category.id.slice(4).toUpperCase()}-00${index + 1}`,
					category_id: categoryId,
					unit_volume: 0.25,
					default_shelf_life_days: 0,
					price: 180 + index * 90,
					revision: 1,
					is_archived: false,
					allowed_actions: [],
				});
				const shelf = freeShelves.shift();
				if (!shelf) throw new Error(`Нет ячейки для товара ${id}`);
				stock.push({
					id: `stock-${id}`,
					product_id: id,
					batch_id: `batch-${id}`,
					revision: 1,
					quantity: 28 + index * 10,
					reserved_quantity: 0,
					expires_on: null,
					cell_x: shelf.x,
					cell_y: shelf.y,
					can_write_off: false,
				});
			}
		}

		for (const category of categories) {
			category.product_count = products.filter(
				(product) =>
					product.category_id === category.id && !product.is_archived,
			).length;
		}

		for (const [index, name] of ["Маяк", "Спутник", "Вектор"].entries()) {
			robots.push({
				id: `robot-sample-${index + 1}`,
				name: `R-0${index + 4} · ${name}`,
				x: 10 + index,
				y: 5,
				roles: [index % 2 ? "inbound" : "outbound"],
				speed: 1.2,
				action_ticks: 2,
				capacity_volume: 90,
				status: "idle",
				revision: 1,
				allowed_actions: [],
			});
		}
		const map = store.get(`${path}/map/state`);
		if (
			map &&
			typeof map === "object" &&
			"robots" in map &&
			Array.isArray(map.robots)
		) {
			map.robots.push(
				...robots
					.filter(({ id }) => id.startsWith("robot-sample-"))
					.map(({ id, x, y, status }) => ({ id, x, y, status })),
			);
		}

		const orders = [
			...originalOrders,
			...recentOrders(warehouseIndex, products, warehouse.time_zone, now),
		];
		const history = collection(eventDto, store, `${path}/events`);
		const createdEvent = history.find(
			({ event_type }) => event_type === "warehouse.created",
		);
		if (createdEvent) createdEvent.created_at = date(61 * 1440);
		const productById = new Map(
			products.map((product) => [product.id, product]),
		);
		for (const order of orders) {
			store.set(`${path}/orders/${order.id}`, order);
			const shipmentPath = `${path}/orders/${order.id}/shipment`;
			const shipment = store.has(shipmentPath)
				? workingShipmentSchema.parse(store.get(shipmentPath))
				: sampleShipment(warehouse, order, products);
			store.set(shipmentPath, shipment);

			history.push({
				id: `event-${order.id}`,
				warehouse_id: warehouse.id,
				created_at: order.created_at,
				event_type: "order.created",
				entity_locator: `order:${order.id}`,
				message: `Создан ${order.number}`,
				detail: order.counterparty_text,
			});
			const delivered = shipment.milestones.find(
				({ code }) => code === "delivered",
			);
			if (delivered?.occurred_at) {
				history.push({
					id: `event-${order.id}-delivered`,
					warehouse_id: warehouse.id,
					created_at: delivered.occurred_at,
					event_type:
						order.kind === "inbound" ? "order.received" : "order.delivered",
					entity_locator: `order:${order.id}`,
					message: `${order.number} · ${order.kind === "inbound" ? "Поставка принята" : "Заказ доставлен"}`,
					detail: `${order.quantity} шт. · ${shipment.route?.destination_address}`,
				});
			}
		}

		for (const cell of layout.cells) {
			const volume = stock
				.filter((item) => item.cell_x === cell.x && item.cell_y === cell.y)
				.reduce((sum, item) => {
					const product = productById.get(item.product_id);
					return (
						sum +
						Number(product?.unit_volume ?? product?.volume_per_unit ?? 0) *
							item.quantity
					);
				}, 0);
			if (volume > Number(cell.capacity_volume))
				cell.capacity_volume = String(Math.ceil(volume / 12) * 12);
		}
		store.set(`${path}/layout`, layout);
		const summary = {
			robotCount: robots.length,
			productCount: products.length,
			activeRobots: robots.filter(({ status }) =>
				["working", "moving", "carrying"].includes(status),
			).length,
			hasWaitingInbound: orders.some(
				({ kind, status }) => kind === "inbound" && status === "draft",
			),
			orders: {
				inbound: orderCounts("inbound", orders),
				outbound: orderCounts("outbound", orders),
			},
		};
		const write_offs = [
			...(warehouse.write_offs ?? []),
			...products.slice(-4).map((product, index) => ({
				id: `writeoff-sample-${index + 1}`,
				product: product.id,
				quantity: index + 1,
				time: date((2 + index * 6) * 1440),
				price: product.price === null ? null : Number(product.price),
				reason:
					index % 2 ? "Повреждение при перемещении" : "Повреждена упаковка",
			})),
		];
		for (const writeOff of write_offs) {
			history.push({
				id: `event-${writeOff.id}`,
				warehouse_id: warehouse.id,
				created_at: writeOff.time,
				event_type: "inventory.written_off",
				entity_locator: `product:${writeOff.product}`,
				message: "Товар списан",
				detail: `${productById.get(writeOff.product)?.name} · ${writeOff.quantity} шт. · ${writeOff.reason}`,
			});
		}
		history.sort((left, right) =>
			right.created_at.localeCompare(left.created_at),
		);
		Object.assign(warehouse, { summary, write_offs });
		const detail = store.get(path);
		if (detail && typeof detail === "object")
			Object.assign(detail, { summary, write_offs });
		for (const [resource, items] of Object.entries({
			robots,
			orders,
			categories,
			products,
			inventory: stock,
			events: history,
		})) {
			store.set(`${path}/${resource}`, { items, total: items.length });
		}
	}
	store.set(warehousePath, { items: warehouses, total: warehouses.length });

	for (const prefix of ["", "/sandbox"]) {
		const usersPath = `${base}${prefix}/admin/shipment-users`;
		const users = usersSchema.parse(store.get(usersPath)).items;
		const selectedWarehouse =
			warehouses.find(({ id }) => id === "warehouse-north") ?? template;
		const extraUsers = accountNames.map((name, index) => ({
			id: `user-sample-${index + 1}`,
			kind: "account" as const,
			name,
			login: `warehouse${index + 1}@gridly.local`,
			revision: 1,
			warehouses: [
				{
					warehouse_id: selectedWarehouse.id,
					warehouse_name: selectedWarehouse.name,
					permissions: [
						"warehouse.view",
						permissionCatalog[index + 1]?.code ?? "warehouse.inventory.view",
					],
				},
			],
		}));
		store.set(usersPath, {
			items: [...users, ...extraUsers],
			permission_catalog: permissionCatalog,
		});

		const auditPath = `${base}${prefix}/admin/shipment-audit`;
		const audit = auditSchema.parse(store.get(auditPath));
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
		const orders = collection(orderDto, store, `${primaryPath}/orders`);
		const latest = orders
			.filter(({ id }) => id.startsWith("order-sample-"))
			.slice(0, 12);
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
				started_at:
					jobStatuses[index] === "pending" ? null : date(4 + index * 5),
			})),
		});
	}
}

function orderCounts(
	kind: "inbound" | "outbound",
	orders: z.infer<typeof orderDto>[],
) {
	const rows = orders.filter((order) => order.kind === kind);
	return {
		total: rows.length,
		active: rows.filter(({ status }) =>
			["active", "awaiting_load", "waiting_confirmation"].includes(status),
		).length,
		completed: rows.filter(({ status }) =>
			["completed", "received", "shipped"].includes(status),
		).length,
	};
}
