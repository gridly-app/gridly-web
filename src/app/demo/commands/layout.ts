import {
	assignZone,
	resizeWarehouse,
	validateMap,
	validateRoutePlans,
	type Warehouse,
} from "@/entities/warehouse";
import type { CommandHandlers } from "./commandHandlers";

function invalidateRoutes(warehouse: Warehouse) {
	try {
		validateRoutePlans(warehouse.cells, warehouse.routePlans || []);
	} catch {
		warehouse.routePlans = [];
	}
}

export const layoutHandlers: Pick<
	CommandHandlers,
	"routes" | "resize" | "simulation" | "draft" | "discard" | "publish" | "zone"
> = {
	routes(warehouse, plans) {
		if (warehouse.running) {
			throw new Error("Поставьте склад на паузу перед сохранением маршрутов");
		}
		validateRoutePlans(warehouse.cells, plans);
		warehouse.routePlans = plans;
	},
	resize(warehouse, { width, height }) {
		if (warehouse.robots.some((r) => r.currentTask))
			throw new Error(
				"Дождитесь завершения задач роботов перед изменением размера",
			);
		if (
			warehouse.orders.some(
				(o) =>
					["running", "waiting"].includes(o.status) &&
					o.allocations?.some((a) => {
						const [x, y] = a.cell.split(",").map(Number);
						return x >= width || y >= height;
					}),
			)
		)
			throw new Error("Нельзя обрезать зарезервированные клетки хранения");
		const cells = resizeWarehouse(warehouse, width, height);

		warehouse.width = width;
		warehouse.height = height;
		warehouse.cells = cells;
		warehouse.draft = null;
		warehouse.version++;
		invalidateRoutes(warehouse);
	},
	simulation: (warehouse) => {
		warehouse.running = !warehouse.running;
	},
	draft: (warehouse, cells) => {
		warehouse.draft = cells;
	},
	discard: (warehouse) => {
		warehouse.draft = null;
	},
	publish(warehouse, cells) {
		if (warehouse.running) {
			throw new Error("Поставьте склад на паузу перед публикацией");
		}
		if (
			warehouse.orders.some((order) =>
				["running", "waiting"].includes(order.status),
			)
		) {
			throw new Error("Завершите активные заказы");
		}
		for (const old of warehouse.cells) {
			if (
				warehouse.stock.some((stock) => stock.cell === `${old.x},${old.y}`) &&
				cells.find((cell) => cell.x === old.x && cell.y === old.y)?.type !==
					old.type
			) {
				throw new Error(
					`Нельзя изменить клетку (${old.x}, ${old.y}) с товаром`,
				);
			}
		}
		for (const robot of warehouse.robots) {
			if (
				!cells.some(
					(cell) =>
						cell.x === robot.x &&
						cell.y === robot.y &&
						["aisle", "charge", "unload", "load"].includes(cell.type),
				)
			) {
				throw new Error(`Клетка робота ${robot.name} должна быть проходимой`);
			}
		}
		const errors = validateMap(cells, warehouse.width, warehouse.height);

		if (errors.length) {
			throw new Error(errors.join("; "));
		}
		warehouse.cells = cells;
		warehouse.draft = null;
		warehouse.version++;
		invalidateRoutes(warehouse);
		warehouse.published = true;
	},
	zone(warehouse, { keys, zone }) {
		if (
			warehouse.orders.some(
				(o) =>
					["running", "waiting"].includes(o.status) &&
					o.allocations?.some(
						(a) =>
							keys.includes(a.cell) &&
							warehouse.products.find(
								(p) => p.id === o.lines[a.lineIndex]?.product,
							)?.category !== zone.categoryId,
					),
			)
		)
			throw new Error(
				"В выделенных клетках зарезервировано место для другой категории",
			);
		for (const stock of warehouse.stock.filter((s) => keys.includes(s.cell))) {
			const product = warehouse.products.find((p) => p.id === stock.product);

			if (product && product.category !== zone.categoryId) {
				throw new Error("В выделенных клетках есть товар другой категории");
			}
		}
		warehouse.cells = assignZone(
			warehouse.cells,
			keys,
			zone,
			warehouse.categories,
		);
	},
};
