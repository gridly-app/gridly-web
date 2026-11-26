import type { ProductDto } from "../src/app/modules/warehouse-data/api/catalog/catalogDto";
import type { OrderDto } from "../src/app/modules/warehouse-data/api/orders/orderDto";
import type { StockDto } from "../src/app/modules/warehouse-data/api/inventory/inventoryDto";
import {
	shiftDay,
	warehouseDay,
} from "../src/app/modules/warehouse/warehouse-information/model/reportPeriod";
import { counterparties } from "./shipment-samples";

const hours = 3600000;

export function sampleStockReceipts(
	stock: StockDto[],
	warehouseIndex: number,
	timeZone: string,
	now: number,
): OrderDto[] {
	const today = warehouseDay(now, timeZone);
	const receipts: OrderDto[] = [];
	const first: StockDto[] = [];
	const second: StockDto[] = [];

	for (const [index, item] of [...stock].entries()) {
		if (item.quantity <= 0) continue;

		const batches = index % 2 ? second : first;
		batches.push(item);

		if (
			item.product_id !== "prod-lamp" ||
			item.quantity < 3 ||
			item.reserved_quantity !== 0
		)
			continue;

		const quantity = Math.floor(item.quantity / 3);
		const split = {
			...item,
			id: `${item.id}-second-receipt`,
			batch_id: `${item.batch_id}-second-receipt`,
			quantity,
			...(item.available_quantity !== undefined && {
				available_quantity: quantity,
			}),
		};
		item.quantity -= quantity;

		if (item.available_quantity !== undefined)
			item.available_quantity -= quantity;

		stock.push(split);
		const otherBatches = index % 2 ? first : second;
		otherBatches.push(split);
	}

	for (const [index, batches] of [first, second].entries()) {
		const party = counterparties[index];

		if (!party || !batches.length) continue;

		const number = 6000 + warehouseIndex * 10 + index;
		const id = `order-sample-inbound-${number}`;
		const orderNumber = `ПР-${number}`;
		const source = { id, number: orderNumber, counterparty_text: party.name };

		const lines = batches.map((item) => {
			item.source_order_id = id;
			item.source_order = source;

			return {
				id: `${id}-${item.id}`,
				product_id: item.product_id,
				quantity: item.quantity,
				putaway_quantity: item.quantity,
				expires_on: item.expires_on,
			};
		});
		const receivedDay = shiftDay(today, -6 - index * 6);

		receipts.push({
			id,
			number: orderNumber,
			kind: "inbound",
			counterparty_text: party.name,
			created_at: `${receivedDay}T08:00:00.000Z`,
			status: "received",
			quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
			allowed_actions: [],
			revision: 1,
			lines,
		});
	}

	return receipts;
}

export function recentOrders(
	warehouseIndex: number,
	products: ProductDto[],
	timezone: string,
	now: number,
) {
	const today = warehouseDay(now, timezone);
	const localHour = new Intl.DateTimeFormat("en", {
		timeZone: timezone,
		hour: "numeric",
		hourCycle: "h23",
	}).format(now);
	const utcOffset = (Number(localHour) - new Date(now).getUTCHours() + 24) % 24;
	const orders: OrderDto[] = [];
	const activeProducts = products.filter(
		({ is_archived, archived_at }) => !is_archived && !archived_at,
	);
	const assortments = [
		activeProducts.filter(
			({ category_id }) =>
				category_id === "cat-food" || category_id === "cat-cold",
		),
		activeProducts.filter(
			({ category_id }) =>
				category_id !== "cat-food" && category_id !== "cat-cold",
		),
	];

	for (let daysAgo = 0; daysAgo < 60; daysAgo++) {
		const day = shiftDay(today, -daysAgo);
		const weekday = new Date(day).getUTCDay();
		const isWeekend = weekday === 0 || weekday === 6;
		for (const kind of ["inbound", "outbound"] as const) {
			const isInbound = kind === "inbound";
			if (daysAgo >= 30 && isWeekend && isInbound) continue;
			const higherVolume = isInbound
				? weekday === 1 || weekday === 4
				: weekday === 2 || weekday === 5;
			const count = daysAgo < 30 && higherVolume ? 2 : 1;
			for (let index = 0; index < count; index++) {
				const number = 4200 + warehouseIndex * 200 + daysAgo * 2 + index;
				const id = `order-sample-${kind}-${number}`;
				const assortmentIndex =
					(daysAgo + warehouseIndex + index + Number(isInbound)) %
					assortments.length;
				const assortment = assortments[assortmentIndex] ?? activeProducts;
				const lineCount = daysAgo % 4 === 0 ? 3 : 2;
				const baseQuantity = isWeekend
					? 2
					: 4 + ((daysAgo + warehouseIndex) % 5);
				const lines = Array.from(
					{ length: Math.min(lineCount, assortment.length) },
					(_, lineIndex) => {
						const product =
							assortment[(daysAgo + index + lineIndex) % assortment.length];
						if (!product) throw new Error(`Пустая номенклатура заказа ${id}`);
						const quantity =
							baseQuantity +
							(isInbound ? 5 : 0) +
							((lineIndex + daysAgo + index) % 4);
						const shelfLife =
							product.default_shelf_life_days ??
							product.standard_shelf_life_days ??
							0;
						return {
							id: `${id}-line-${lineIndex + 1}`,
							product_id: product.id,
							quantity,
							expires_on:
								isInbound && shelfLife > 0
									? shiftDay(day, Math.ceil(shelfLife / 2))
									: null,
						};
					},
				);
				const status = sampleOrderStatus(kind, daysAgo, index);
				const party =
					counterparties[
						(daysAgo + warehouseIndex + index + Number(!isInbound)) %
							counterparties.length
					];
				if (!party) throw new Error(`Нет контрагента для заказа ${id}`);
				const scheduled = Date.parse(day) + (8 + index * 3 - utcOffset) * hours;
				const created = Math.min(scheduled, now);
				orders.push({
					id,
					number: `${isInbound ? "ПР" : "ЗК"}-${number}`,
					kind,
					counterparty_text: party.name,
					created_at: new Date(created).toISOString(),
					status,
					...(status === "cancelled" && {
						blocked_reason: "Контрагент отменил заказ",
					}),
					quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
					revision: 1,
					allowed_actions: [],
					lines,
				});
			}
		}
	}
	return orders;
}

function sampleOrderStatus(
	kind: OrderDto["kind"],
	daysAgo: number,
	index: number,
) {
	if (daysAgo === 0) return index === 0 ? "draft" : "created";
	if (daysAgo === 1)
		return kind === "outbound" ? "awaiting_load" : "waiting_confirmation";
	if (daysAgo === 2) return kind === "outbound" ? "shipped" : "active";
	if (daysAgo % 13 === 0) return "cancelled";
	return kind === "outbound" ? "completed" : "received";
}
