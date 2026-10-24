import { id } from "@/shared/lib";
import type { Warehouse } from "./schemas";

export function createWarehouse(
	name: string,
	width: number,
	height: number,
): Warehouse {
	return {
		id: id(),
		name,
		location: "Виртуальный склад",
		width,
		height,
		timezone: "Europe/Moscow",
		published: false,
		version: 0,
		running: false,
		cells: Array.from({ length: width * height }, (_, i) => ({
			x: i % width,
			y: Math.floor(i / width),
			type: "empty",
			capacity: 20,
		})),
		draft: null,
		robots: [],
		categories: [],
		products: [],
		stock: [],
		orders: [],
		events: [],
		policy: [false, false, false, false],
		tick: "0",
	};
}
