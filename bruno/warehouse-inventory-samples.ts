import {
	categoryDto,
	productDto,
} from "../src/app/modules/warehouse-data/api/catalog/catalogDto";
import { stockDto } from "../src/app/modules/warehouse-data/api/inventory/inventoryDto";
import { layoutDto } from "../src/app/modules/warehouse-data/api/layout/layout.dto";
import { robotDto } from "../src/app/modules/warehouse-data/api/robots/robotDto";

import type { MockStore } from "./mock-http";
import { collection } from "./sample-collection";

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

export function sampleWarehouseInventory(store: MockStore, path: string) {
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
			(product) => product.category_id === category.id && !product.is_archived,
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
		for (const { id, x, y, status } of robots) {
			if (!id.startsWith("robot-sample-")) continue;

			map.robots.push({ id, x, y, status });
		}
	}
	return { products, categories, stock, robots, layout };
}
