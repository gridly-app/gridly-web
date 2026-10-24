import { createWarehouse } from "@/entities/warehouse";
import type { DemoFixture } from "../runtime/warehouseStore";
import {
	type SimulationContext,
	scenarioDate,
	systemContext,
} from "../simulation/context";
import { namespaceDemoWarehouses } from "./createDemoWarehouses";
import { populateScenario } from "./populateScenario";

export function seed(context: SimulationContext = systemContext): DemoFixture {
	const now = context.now();
	const warehouse = createWarehouse("Центральный склад", 36, 24);

	warehouse.id = "central";
	warehouse.published = true;
	warehouse.version = 3;
	warehouse.running = false;
	warehouse.location = "Москва · Основной склад";
	warehouse.tick = "0";
	warehouse.cells = warehouse.cells.map((cell) => ({
		...cell,
		type:
			cell.x === 0 || cell.y === 0 || cell.x === 35 || cell.y === 23
				? "wall"
				: cell.x >= 3 &&
						cell.x <= 16 &&
						[3, 4, 7, 8].includes(cell.y) &&
						![7, 12].includes(cell.x)
					? cell.x > 12
						? "cold"
						: "storage"
					: "aisle",
	}));
	for (const y of [1, 2, 3]) {
		warehouse.cells[y * 36] = { x: 0, y, type: "unload", capacity: 40 };
	}
	for (const y of [10, 11, 12]) {
		warehouse.cells[y * 36 + 35] = { x: 35, y, type: "load", capacity: 40 };
	}
	for (const x of [3, 6, 9, 12]) warehouse.cells[12 * 36 + x].type = "charge";
	warehouse.categories = [
		{ id: "c1", name: "Электроника", cold: false },
		{ id: "c2", name: "Продукты", cold: true },
		{ id: "c3", name: "Товары для дома", cold: false },
	];
	warehouse.products = [
		{
			id: "p1",
			name: "Телевизор Samsung 43″",
			sku: "EL-0042",
			category: "c1",
			volume: "0.500",
			price: "32990.00",
			shelf: 0,
		},
		{
			id: "p2",
			name: "Молоко 3,2% · 1 л",
			sku: "FD-0108",
			category: "c2",
			volume: "0.050",
			price: "99.00",
			shelf: 14,
		},
		{
			id: "p3",
			name: "Кофемашина DeLonghi",
			sku: "EL-0061",
			category: "c1",
			volume: "0.250",
			price: "45900.00",
			shelf: 0,
		},
		{
			id: "p4",
			name: "Говядина охлаждённая",
			sku: "FD-0120",
			category: "c2",
			volume: "0.500",
			price: "890.00",
			shelf: 7,
		},
		{
			id: "p5",
			name: "Набор посуды",
			sku: "HM-0007",
			category: "c3",
			volume: "0.200",
			price: "2490.00",
			shelf: 0,
		},
	];
	warehouse.stock = [
		{
			id: context.nextId(),
			product: "p1",
			quantity: 64,
			reserved: 0,
			expires: "",
			cell: "3,3",
		},
		{
			id: context.nextId(),
			product: "p2",
			quantity: 180,
			reserved: 0,
			expires: scenarioDate(
				new Date(now.getTime() + 10 * 86400000),
				warehouse.timezone,
			),
			cell: "14,3",
		},
		{
			id: context.nextId(),
			product: "p3",
			quantity: 32,
			reserved: 0,
			expires: "",
			cell: "4,3",
		},
		{
			id: context.nextId(),
			product: "p4",
			quantity: 24,
			reserved: 0,
			expires: scenarioDate(
				new Date(now.getTime() - 2 * 86400000),
				warehouse.timezone,
			),
			cell: "15,3",
		},
		{
			id: context.nextId(),
			product: "p5",
			quantity: 96,
			reserved: 0,
			expires: "",
			cell: "5,7",
		},
	];
	warehouse.robots = Array.from({ length: 6 }, (_, i) => ({
		id: context.nextId(),
		name: `Atlas ${String(i + 1).padStart(2, "0")}`,
		roles: i % 3 === 0 ? ["unload", "sort"] : i % 3 === 1 ? ["sort"] : ["ship"],
		x: [2, 7, 12, 17, 9, 5][i],
		y: [2, 5, 6, 9, 10, 11][i],
		speed: 2,
		duration: 3,
		capacity: "10.000",
		status: i === 1 ? "waiting" : i < 4 ? "running" : "idle",
	}));
	warehouse.orders = [
		{
			id: context.nextId(),
			number: "IN-0024",
			kind: "inbound",
			party: "ООО «ТехноОпт»",
			status: "waiting",
			lines: [{ product: "p1", quantity: 12, expires: "" }],
			manual: [true, false, false, false],
			stage: 0,
			created: now.toISOString(),
		},
		{
			id: context.nextId(),
			number: "OUT-0018",
			kind: "outbound",
			party: "Магазин «Север»",
			status: "draft",
			lines: [{ product: "p3", quantity: 4, expires: "" }],
			manual: [false, false, false, true],
			stage: 0,
			created: now.toISOString(),
		},
	];
	warehouse.events = [
		{
			id: context.nextId(),
			time: now.toISOString(),
			title: "Поставка ожидает разгрузки",
			detail: "IN-0024 · ООО «ТехноОпт» · Atlas 01",
		},
		{
			id: context.nextId(),
			time: now.toISOString(),
			title: "Карта опубликована",
			detail: "Версия 3 · 36 × 24 клетки",
		},
	];
	warehouse.cells = warehouse.cells.map((cell) => {
		if (!["storage", "cold"].includes(cell.type)) {
			return cell;
		}
		const categoryId = cell.type === "cold" ? "c2" : cell.y >= 7 ? "c3" : "c1";

		return {
			...cell,
			zone: {
				id: `zone-${categoryId}`,
				name:
					categoryId === "c2"
						? "Холодильная зона"
						: categoryId === "c3"
							? "Товары для дома"
							: "Электроника",
				categoryId,
			},
		};
	});
	populateScenario(warehouse, context);
	const regional = [
		["Северный склад", "Санкт-Петербург", 36, 24],
		["Южный склад", "Краснодар", 40, 26],
		["Восточный склад", "Казань", 44, 28],
	] as const;
	const cellIndex = new Map(warehouse.cells.map((c) => [`${c.x},${c.y}`, c]));
	const warehouses = [
		warehouse,
		...regional.map(([name, city, width, height]) => {
			const copy = structuredClone(warehouse);

			copy.id = `regional-${city}`;
			copy.name = name;
			copy.location = city;
			copy.cells = Array.from({ length: width * height }, (_, i) => {
				const x = i % width,
					y = Math.floor(i / width);
				const source = cellIndex.get(
					`${x === width - 1 ? warehouse.width - 1 : x},${y === height - 1 ? warehouse.height - 1 : y}`,
				);
				if (x === 0 || y === 0 || x === width - 1 || y === height - 1)
					return {
						...(source || { capacity: 0 }),
						x,
						y,
						type:
							source?.type === "load" || source?.type === "unload"
								? source.type
								: ("wall" as const),
					};
				if (source && x < warehouse.width - 1 && y < warehouse.height - 1)
					return { ...source, x, y };
				return { x, y, type: "aisle" as const, capacity: 0 };
			});
			copy.width = width;
			copy.height = height;
			copy.events = [];

			return copy;
		}),
	];

	return { warehouses: namespaceDemoWarehouses(warehouses), demoVersion: 4 };
}
