import {
	cellKey,
	type Order,
	startOrder,
	type Warehouse,
} from "@/entities/warehouse";
import {
	type SimulationContext,
	scenarioDate,
	systemContext,
} from "../simulation/context";
import { catalog } from "./catalog";
import { placeFixtureStock } from "./placeFixtureStock";

export function populateScenario(
	warehouse: Warehouse,
	context: SimulationContext = systemContext,
): Warehouse {
	const now = context.now();
	for (const [id, name] of [
		["c4", "Одежда"],
		["c5", "Инструменты"],
		["c6", "Косметика"],
		...[
			"Книги",
			"Игрушки",
			"Спорт",
			"Канцтовары",
			"Зоотовары",
			"Автотовары",
			"Мебель",
			"Обувь",
			"Сад",
			"Посуда",
			"Освещение",
			"Аксессуары",
		].map((name, index) => [`c${index + 7}`, name]),
	]) {
		if (!warehouse.categories.some((category) => category.id === id)) {
			warehouse.categories.push({ id, name, cold: false });
		}
	}
	if (warehouse.width >= 32 && warehouse.height >= 22) {
		for (const cell of warehouse.cells) {
			if (
				![15, 16, 18, 19].includes(cell.y) ||
				![
					3, 4, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 21, 22, 23, 24, 26, 27, 28,
					29,
				].includes(cell.x) ||
				cell.type !== "aisle"
			) {
				continue;
			}
			const categoryId =
				cell.x < 7
					? "c4"
					: cell.x < 12
						? "c3"
						: cell.x < 17
							? "c2"
							: cell.x < 25
								? "c5"
								: "c6";
			const category = warehouse.categories.find(
				(category) => category.id === categoryId,
			);
			if (!category) throw new Error(`Демо-категория ${categoryId} не найдена`);

			cell.type = category.cold ? "cold" : "storage";
			cell.capacity = 20;
			cell.zone = {
				id: `demo-${categoryId}-${cell.y < 18 ? 15 : 18}`,
				name: `${category.name} · ${cell.y < 18 ? "А" : "Б"}`,
				categoryId,
			};
		}
	}
	for (const [productId, name, category, volume] of catalog) {
		if (warehouse.products.some((product) => product.id === productId)) {
			continue;
		}
		warehouse.products.push({
			id: productId,
			name,
			category,
			sku: `DEMO-${productId.toUpperCase()}`,
			volume: volume.toFixed(3),
			price: String(500 + Number(productId.slice(1)) * 350),
			shelf: category === "c2" ? 14 : 0,
		});
		const shelf = warehouse.cells.find(
			(cell) => cell.zone?.categoryId === category,
		);

		if (shelf) {
			warehouse.stock.push({
				id: context.nextId(),
				product: productId,
				quantity: 30,
				reserved: 0,
				expires:
					category === "c2"
						? scenarioDate(
								new Date(now.getTime() + 14 * 86400000),
								warehouse.timezone,
							)
						: "",
				cell: cellKey(shelf),
			});
		}
	}
	for (const [index, category] of warehouse.categories.slice(6).entries()) {
		const left = 21 + (index % 3) * 4;
		const top = 3 + Math.floor(index / 3) * 3;
		const candidates = warehouse.cells.filter(
			(cell) =>
				cell.x >= left &&
				cell.x < left + 3 &&
				cell.y >= top &&
				cell.y < top + 2 &&
				cell.type === "aisle",
		);

		candidates.forEach((cell) => {
			cell.type = "storage";
			cell.capacity = 20;
			cell.zone = {
				id: `demo-${category.id}`,
				name: category.name,
				categoryId: category.id,
			};
		});
		const productId = `demo-product-${category.id}`;

		if (
			candidates.length &&
			!warehouse.products.some((product) => product.id === productId)
		) {
			warehouse.products.push({
				id: productId,
				name: `${category.name} · комплект`,
				sku: `CAT-${category.id}`,
				category: category.id,
				volume: "0.020",
				price: "1500",
				shelf: 0,
			});
			warehouse.stock.push({
				id: context.nextId(),
				product: productId,
				quantity: 40,
				reserved: 0,
				expires: "",
				cell: cellKey(candidates[0]),
			});
		}
	}
	for (const y of [6, 12, 18, 21]) {
		if (y >= warehouse.height - 1) {
			continue;
		}
		const unload = warehouse.cells.find((cell) => cell.x === 0 && cell.y === y);
		const load = warehouse.cells.find(
			(cell) => cell.x === warehouse.width - 1 && cell.y === y,
		);

		if (unload) {
			unload.type = "unload";
			unload.capacity = 40;
		}
		if (load) {
			load.type = "load";
			load.capacity = 40;
		}
	}
	const occupied = new Set(warehouse.robots.map(cellKey));
	const positions = warehouse.cells.filter(
		(cell) =>
			cell.type === "aisle" &&
			!occupied.has(cellKey(cell)) &&
			cell.y >= 5 &&
			cell.y <= 12,
	);

	while (warehouse.robots.length < 16 && positions.length) {
		const position = positions.shift();
		if (!position) break;

		warehouse.robots.push({
			id: context.nextId(),
			name: `Atlas ${String(warehouse.robots.length + 1).padStart(2, "0")}`,
			roles: ["unload", "sort", "ship"],
			x: position.x,
			y: position.y,
			speed: 2,
			duration: 1,
			capacity: "10.000",
			status: "idle",
		});
	}
	warehouse.robots.forEach((robot) => {
		if (!robot.currentTask) {
			robot.status = "idle";
		}
	});
	placeFixtureStock(warehouse, context.nextId);
	const productIds = ["p6", "p11", "p14", "p17", "p8", "p20", "p7", "p12"];

	for (const [index, productId] of productIds.entries()) {
		const product = warehouse.products.find(
			(product) => product.id === productId,
		);
		if (!product) continue;

		if (
			warehouse.orders.some(
				(order) =>
					order.number === `${index % 2 ? "OUT" : "IN"}-DEMO-${index + 1}`,
			)
		) {
			continue;
		}
		warehouse.orders.push({
			id: context.nextId(),
			number: `${index % 2 ? "OUT" : "IN"}-DEMO-${index + 1}`,
			kind: index % 2 ? "outbound" : "inbound",
			party: index % 2 ? "Демо · интернет-магазин" : "Демо · поставщик",
			status: "draft",
			lines: [
				{
					product: productId,
					quantity: 4,
					expires: product.shelf
						? scenarioDate(
								new Date(now.getTime() + product.shelf * 86400000),
								warehouse.timezone,
							)
						: "",
				},
			],
			manual: [false, false, false, false],
			stage: 0,
			created: now.toISOString(),
			demoAutoStart: true,
		});
	}
	warehouse.stateVersion = warehouse.tick;
	for (let index = 0; index < 12; index++) {
		const number = `MANUAL-${String(index + 1).padStart(2, "0")}`;

		if (warehouse.orders.some((order) => order.number === number)) {
			continue;
		}
		const product = warehouse.products.find(
			(product) => product.id === productIds[index % productIds.length],
		);
		if (!product) continue;
		const order: Order = {
			id: context.nextId(),
			number,
			kind: index % 2 ? ("outbound" as const) : ("inbound" as const),
			party: index % 2 ? "Магазин · ручная отгрузка" : "Демо · ручная приёмка",
			status: "draft",
			lines: [
				{
					product: product.id,
					quantity: 2,
					expires: product.shelf
						? scenarioDate(
								new Date(now.getTime() + product.shelf * 86400000),
								warehouse.timezone,
							)
						: "",
				},
			],
			manual: [true, false, false, false],
			stage: 0,
			created: now.toISOString(),
		};

		try {
			startOrder(warehouse, order, scenarioDate(now, warehouse.timezone));
		} catch (error) {
			order.status = "blocked";
			order.reason = error instanceof Error ? error.message : String(error);
		}
		warehouse.orders.push(order);
	}
	warehouse.running = false;

	warehouse.demoVersion = 4;

	return warehouse;
}
