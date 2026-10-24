import {
	type Cell,
	cellKey,
	createWarehousePathfinder,
	expired,
	type GridPosition,
	type RobotTask,
	type Warehouse,
} from "@/entities/warehouse";

type ReadonlyState<T> = T extends object
	? { readonly [K in keyof T]: ReadonlyState<T[K]> }
	: T;
export type TaskPlanResult =
	| { kind: "planned"; robotId: string; task: RobotTask }
	| { kind: "try-next"; reason: string }
	| { kind: "wait"; reason: string };

export function createPlanningContext(warehouse: Warehouse, today: string) {
	return {
		warehouse: warehouse as ReadonlyState<Warehouse>,
		products: new Map(warehouse.products.map((p) => [p.id, p])),
		orders: new Map(warehouse.orders.map((o) => [o.id, o])),
		robots: new Map(warehouse.robots.map((r) => [r.id, r])),
		stocks: new Map(warehouse.stock.map((s) => [s.id, s])),
		today,
		cells: new Map(warehouse.cells.map((c) => [cellKey(c), c])),
		path: createWarehousePathfinder(warehouse.cells),
	};
}
type PlanningContext = ReturnType<typeof createPlanningContext>;

export function planTask(
	context: PlanningContext,
	orderId: string,
	robotId: string,
): TaskPlanResult {
	const { warehouse: w, cells, path, today } = context;
	const order: ReadonlyState<Warehouse["orders"][number]> | undefined =
		context.orders.get(orderId);
	const robot: ReadonlyState<Warehouse["robots"][number]> | undefined =
		context.robots.get(robotId);
	if (order?.status !== "running" || !robot || robot.currentTask)
		return { kind: "try-next", reason: "Кандидат занят" };
	const role =
		order.kind === "inbound"
			? robot.roles.some((r) => ["unload", "sort"].includes(r))
			: robot.roles.includes("ship");
	if (!role) return { kind: "try-next", reason: "Неподходящая роль" };
	const docks = [...cells.values()].filter(
		(c) => c.type === (order.kind === "inbound" ? "unload" : "load"),
	);
	if (!docks.length) return { kind: "wait", reason: "Нет доступного дока" };
	const offset =
		Math.max(
			0,
			w.orders.findIndex((o) => o.id === orderId),
		) % docks.length;
	const candidates = [...docks.slice(offset), ...docks.slice(0, offset)];
	let reason = "Нет доступного распределения груза";
	for (const [allocationIndex, a] of (order.allocations || []).entries()) {
		const line = order.lines[a.lineIndex];
		const product = context.products.get(line.product);
		if (!product) {
			reason = "Товар не найден";
			continue;
		}
		const active = w.robots.reduce(
			(n, r) =>
				n +
				(r.currentTask?.orderId === orderId &&
				r.currentTask.allocationIndex === allocationIndex
					? r.currentTask.quantity
					: 0),
			0,
		);
		const left = a.quantity - a.delivered - active;
		if (left <= 0) continue;
		const quantity = Math.min(
			left,
			Math.floor(Number(robot.capacity) / Number(product.volume)),
		);
		if (!Number.isFinite(quantity) || quantity < 1) {
			reason = "Робот не вмещает единицу товара";
			continue;
		}
		const shelf = cells.get(a.cell);
		if (!shelf) {
			reason = "Место хранения не найдено";
			continue;
		}
		if (order.kind === "outbound") {
			const stock = a.stockId ? context.stocks.get(a.stockId) : undefined;
			if (
				!stock ||
				stock.reserved < quantity ||
				expired(stock.expires, today)
			) {
				reason = "Зарезервированная партия недоступна";
				continue;
			}
		}
		const access = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]
			.map(([dx, dy]) => cells.get(`${shelf.x + dx},${shelf.y + dy}`))
			.filter(
				(c): c is Cell =>
					!!c && ["aisle", "charge", "load", "unload"].includes(c.type),
			);
		const configured = w.routePlans?.find((p) => p.keys.includes(a.cell));
		for (const dock of candidates) {
			const route =
				order.kind === "inbound" ? configured?.inbound : configured?.outbound;
			const pickup = path(
				[robot],
				order.kind === "inbound" ? [route?.[0] || dock] : access,
			);
			const origin = pickup.at(-1);
			if (!origin) {
				reason = "Нет пути к месту получения груза";
				continue;
			}
			let delivery: GridPosition[] = path(
				[origin],
				order.kind === "inbound" ? access : [route?.at(-1) || dock],
			);
			if (route?.length) {
				const connection =
					order.kind === "inbound"
						? path([route[route.length - 1]], access)
						: path([origin], [route[0]]);
				if (!connection.length) {
					reason = "Нет пути через заданный маршрут";
					continue;
				}
				delivery =
					order.kind === "inbound"
						? [...route, ...connection.slice(1)]
						: [...connection, ...route.slice(1)];
			}
			const destination = delivery.at(-1);
			if (!destination) {
				reason = "Нет пути к месту доставки";
				continue;
			}
			return {
				kind: "planned",
				robotId,
				task: {
					allocationIndex,
					shelfKey: a.cell,
					deliveryRoute: delivery.map(({ x, y }) => ({ x, y })),
					orderId,
					productId: product.id,
					lineIndex: a.lineIndex,
					quantity,
					phase: "pickup",
					label: order.kind === "inbound" ? "К разгрузке" : "К товару",
					target: { x: origin.x, y: origin.y },
					destination: { x: destination.x, y: destination.y },
					route: pickup.map(({ x, y }) => ({ x, y })),
					actionTicks: 0,
					carrying: false,
				},
			};
		}
	}
	return { kind: "try-next", reason };
}

export function applyTaskPlan(
	warehouse: Warehouse,
	plan: Extract<TaskPlanResult, { kind: "planned" }>,
	nextId: () => string,
) {
	const robot = warehouse.robots.find((r) => r.id === plan.robotId);
	const order = warehouse.orders.find((o) => o.id === plan.task.orderId);
	const a = order?.allocations?.[plan.task.allocationIndex ?? -1];
	const active = warehouse.robots.reduce(
		(n, r) =>
			n +
			(r.currentTask?.orderId === order?.id &&
			r.currentTask?.allocationIndex === plan.task.allocationIndex
				? r.currentTask?.quantity || 0
				: 0),
		0,
	);
	if (
		!robot ||
		robot.currentTask ||
		order?.status !== "running" ||
		!a ||
		a.quantity - a.delivered - active < plan.task.quantity
	)
		return false;
	robot.currentTask = { ...structuredClone(plan.task), id: nextId() };
	delete robot.returnRoute;
	robot.status = "moving";
	order.stage = 0;
	delete order.reason;
	return true;
}
