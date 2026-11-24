import { z } from "zod";
import { eventDto } from "../src/app/modules/warehouse-data/api/history/historyDto";
import { orderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";
import { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import { workingShipmentSchema } from "../src/app/modules/warehouse/shipment-management/model/shipment.dto";

import { seedUsers } from "./admin-user-samples";
import { base, type MockStore } from "./mock-http";
import { seedMonitoring } from "./monitoring-samples";
import { recentOrders } from "./order-samples";
import { collection } from "./sample-collection";
import { sampleShipment } from "./shipment-samples";
import { sampleWarehouseInventory } from "./warehouse-inventory-samples";

const primaryPath = `${base}/warehouses/warehouse-demo`;
const warehouseList = z.object({ items: z.array(warehouseDto) });
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
		const { products, categories, stock, robots, layout } =
			sampleWarehouseInventory(store, path);
		const originalOrders =
			warehouseIndex < 2 ? collection(orderDto, store, `${path}/orders`) : [];

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
			let volume = 0;

			for (const item of stock) {
				if (item.cell_x !== cell.x || item.cell_y !== cell.y) continue;

				const product = productById.get(item.product_id);
				const unitVolume =
					product?.unit_volume ?? product?.volume_per_unit ?? 0;

				volume += Number(unitVolume) * item.quantity;
			}

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
		const writeOffProducts = products.slice(-4);
		const write_offs = [
			...(warehouse.write_offs ?? []),
			...writeOffProducts.map((product, index) => ({
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

	const selectedWarehouse =
		warehouses.find(({ id }) => id === "warehouse-north") ?? template;
	const orders = collection(orderDto, store, `${primaryPath}/orders`);

	for (const prefix of ["", "/sandbox"]) {
		seedUsers(store, prefix, warehouses, selectedWarehouse);
		seedMonitoring(store, prefix, template, orders, date);
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
