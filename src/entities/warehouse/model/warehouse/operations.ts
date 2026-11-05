import type { Order, Product, Robot, Stock, Warehouse } from "./schemas";

const completed = new Set([
	"received",
	"received_with_losses",
	"shipped",
	"completed",
]);
const cancelled = new Set(["cancelled", "canceled", "aborted"]);
export interface CompletionForecast {
	at: number | null;
	note: string;
}
export function productPrice(raw: string | undefined): number | null {
	if (!raw?.trim()) return null;
	const value = Number(raw.replace(",", "."));
	return Number.isFinite(value) && value >= 0 ? value : null;
}
export function orderValue(order: Order, products: readonly Product[]) {
	if (!order.lines.length)
		return {
			value: 0,
			unknown: order.quantity ?? 1,
			label: "Нет данных о составе",
		};
	const prices = new Map(
		products.map((product) => [product.id, productPrice(product.price)]),
	);
	let value = 0,
		unknown = 0;
	for (const line of order.lines) {
		const price = prices.get(line.product);
		if (price === undefined || price === null) unknown += line.quantity;
		else value += price * line.quantity;
	}
	return {
		value,
		unknown,
		label:
			unknown && !value
				? "Цена не задана"
				: `${unknown ? "от " : ""}${value.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 })}`,
	};
}
export function productOccupancy(product: Product, stock: readonly Stock[]) {
	const quantity = stock
		.filter((item) => item.product === product.id)
		.reduce((sum, item) => sum + item.quantity, 0);
	const unitVolume = product.volume.trim()
		? Number(product.volume.replace(",", "."))
		: NaN;
	return {
		quantity,
		volume:
			Number.isFinite(unitVolume) && unitVolume >= 0
				? quantity * unitVolume
				: null,
	};
}
const distance = (route: readonly { x: number; y: number }[]) =>
	route.reduce((sum, point, index) => {
		const previous = route[index - 1];
		return (
			sum +
			(previous
				? Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y)
				: 0)
		);
	}, 0);
function remainingTaskTicks(robot: Robot): number | null {
	const task = robot.currentTask;
	if (
		!task ||
		robot.speed <= 0 ||
		["blocked", "waiting", "unavailable"].includes(robot.status)
	)
		return null;
	const route = task.route;
	const currentIndex = route.findIndex(
		(point) => point.x === robot.x && point.y === robot.y,
	);
	const remaining =
		currentIndex >= 0
			? route.slice(currentIndex)
			: [{ x: robot.x, y: robot.y }, ...route];
	let ticks =
		distance(remaining) / robot.speed +
		Math.max(task.actionTicks, robot.duration, 0);
	if (task.phase === "pickup") {
		if (!task.deliveryRoute?.length) return null;
		ticks +=
			distance(task.deliveryRoute) / robot.speed + Math.max(robot.duration, 0);
	}
	return Math.max(1, ticks);
}
export function orderCompletion(
	order: Order,
	warehouse: Pick<Warehouse, "running" | "robots" | "asOf" | "lastTickAt">,
	tickMs: number | null,
): CompletionForecast {
	if (completed.has(order.status)) return { at: null, note: "Завершён" };
	if (cancelled.has(order.status)) return { at: null, note: "Отменён" };
	if (["draft", "created"].includes(order.status))
		return { at: null, note: "После запуска заказа" };
	if (!warehouse.running) return { at: null, note: "После запуска обработки" };
	if (
		order.allowedActions?.some((action) => action.startsWith("confirm")) ||
		Object.values(order.manual).some(Boolean)
	)
		return { at: null, note: "Требуется ручное подтверждение" };
	const robots = warehouse.robots.filter(
		(robot) => robot.currentTask?.orderId === order.id,
	);
	if (!robots.length) return { at: null, note: "Ожидает назначения робота" };
	const durations = robots.map(remainingTaskTicks);
	if (durations.some((ticks) => ticks === null))
		return { at: null, note: "Ожидает пути или данных маршрута" };
	if (tickMs === null) return { at: null, note: "Уточняется темп обработки" };
	const at = Date.parse(warehouse.asOf ?? warehouse.lastTickAt ?? "");
	if (!Number.isFinite(at)) return { at: null, note: "Нет времени обновления" };
	const remaining = order.lines.length
		? order.lines.reduce(
				(sum, line) =>
					sum +
					Math.max(
						0,
						line.quantity - (line.putaway ?? 0) - (line.writtenOff ?? 0),
					),
				0,
			)
		: (order.quantity ?? 0);
	const assigned = robots.reduce(
		(sum, robot) => sum + (robot.currentTask?.quantity ?? 0),
		0,
	);
	if (!assigned) return { at: null, note: "Ожидает назначения партии" };
	const longest = Math.max(
		...durations.filter((ticks): ticks is number => ticks !== null),
	);
	let estimatedTicks = longest;
	if (remaining > assigned) {
		let throughput = 0;
		for (const robot of robots) {
			const task = robot.currentTask;
			if (!task?.deliveryRoute?.length || robot.speed <= 0)
				return { at: null, note: "Нужны маршруты следующих партий" };
			const cycle = Math.max(
				1,
				(2 * distance(task.deliveryRoute)) / robot.speed +
					2 * Math.max(robot.duration, 0),
			);
			throughput += task.quantity / cycle;
		}
		if (throughput <= 0)
			return { at: null, note: "Уточняется производительность" };
		estimatedTicks += (remaining - assigned) / throughput;
	}

	return {
		at: at + estimatedTicks * tickMs,
		note: "Прогноз по текущим маршрутам и темпу; задержки и новые назначения могут изменить срок",
	};
}
export function incomingProduct(
	productId: string,
	warehouse: Warehouse,
	tickMs: number | null,
) {
	const orders = warehouse.orders.filter(
		(order) =>
			order.kind === "inbound" &&
			!completed.has(order.status) &&
			!cancelled.has(order.status),
	);
	const incoming = orders.flatMap((order) => {
		const quantity = order.lines
			.filter((line) => line.product === productId)
			.reduce(
				(sum, line) =>
					sum +
					Math.max(
						0,
						line.quantity - (line.putaway ?? 0) - (line.writtenOff ?? 0),
					),
				0,
			);
		return quantity > 0
			? [
					{
						quantity,
						order,
						forecast: orderCompletion(order, warehouse, tickMs),
					},
				]
			: [];
	});
	incoming.sort((a, b) => {
		const aTime = a.forecast.at ?? Number.POSITIVE_INFINITY;
		const bTime = b.forecast.at ?? Number.POSITIVE_INFINITY;
		return aTime === bTime
			? a.order.created.localeCompare(b.order.created) ||
					a.order.id.localeCompare(b.order.id)
			: aTime - bTime;
	});
	return {
		quantity: incoming.reduce((sum, item) => sum + item.quantity, 0),
		deliveries: incoming.map(({ order, quantity, forecast }) => ({
			orderId: order.id,
			orderNumber: order.number,
			party: order.party,
			status: order.status,
			quantity,
			forecast,
		})),
	};
}
export function robotAssignment(
	robot: Robot,
	warehouse: Pick<Warehouse, "orders" | "products">,
) {
	const task = robot.currentTask;
	if (!task)
		return {
			title:
				robot.status === "charging"
					? "На зарядке"
					: robot.returnRoute?.length
						? "Возвращается на стоянку"
						: robot.status === "idle"
							? "Ожидает задачу"
							: "Задача не передана",
			detail: "",
			order: undefined,
		};
	const order = warehouse.orders.find((item) => item.id === task.orderId);
	const product = warehouse.products.find((item) => item.id === task.productId);
	const title =
		order?.kind === "inbound"
			? task.carrying
				? "Размещает поставку"
				: "Разгружает поставку"
			: order?.kind === "outbound"
				? task.carrying
					? "Везёт на отгрузку"
					: "Забирает товар для отгрузки"
				: task.label;
	return {
		title,
		order: {
			id: task.orderId,
			kind: order?.kind,
			number: order?.number ?? task.orderId,
		},
		detail: `${product?.name ?? task.productId} · ${task.quantity} шт.`,
	};
}
