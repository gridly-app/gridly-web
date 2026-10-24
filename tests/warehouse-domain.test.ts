import { describe, expect, test } from "bun:test";
import {
	type Cell,
	createWarehouse,
	defaultBlockRoutes,
	findWarehousePath,
	validateRoutePlans,
} from "../src/entities/warehouse";

function map(): Cell[] {
	return Array.from({ length: 15 }, (_, index) => ({
		x: index % 5,
		y: Math.floor(index / 5),
		type: "aisle",
		capacity: 20,
	}));
}

describe("warehouse routes", () => {
	test("finds a shortest route around a wall without mutating the map", () => {
		const cells = map();
		cells[2].type = "wall";
		const original = structuredClone(cells);
		const path = findWarehousePath(cells, [{ x: 0, y: 0 }], [{ x: 4, y: 0 }]);
		expect(path).toHaveLength(7);
		expect(path.at(-1)).toMatchObject({ x: 4, y: 0 });
		expect(path.some((cell) => cell.type === "wall")).toBe(false);
		expect(cells).toEqual(original);
	});

	test("returns no path if occupied cells cut off the target", () => {
		const blocked = new Set(["2,0", "2,1", "2,2"]);
		expect(
			findWarehousePath(map(), [{ x: 0, y: 0 }], [{ x: 4, y: 0 }], blocked),
		).toEqual([]);
	});

	test("generated dock routes pass the same validation as saved routes", () => {
		const cells = map();
		cells[0].type = "unload";
		cells[4].type = "load";
		cells[7].type = "storage";
		const routes = defaultBlockRoutes(cells, [cells[7]]);
		const plan = { id: "shelf", keys: ["2,1"], ...routes };
		expect(routes.inbound.length).toBeGreaterThan(0);
		expect(() => validateRoutePlans(cells, [plan])).not.toThrow();
		cells[7].type = "wall";
		expect(() => validateRoutePlans(cells, [plan])).toThrow(
			"Блок хранения изменился",
		);
	});

	test("new warehouses have independent state and exactly one cell per coordinate", () => {
		const first = createWarehouse("First", 3, 2);
		const second = createWarehouse("Second", 3, 2);
		first.policy[0] = true;
		expect(second.policy[0]).toBe(false);
		expect(first.id).not.toBe(second.id);
		expect(new Set(first.cells.map((cell) => `${cell.x},${cell.y}`)).size).toBe(
			6,
		);
	});
});
