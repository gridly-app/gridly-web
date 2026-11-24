import { expect, test } from "bun:test";
import { layoutDto } from "./layout.dto";
import { serializeLayoutCells } from "./layoutCells";

test("writing zones separates persisted ids from temporary ids and translates the category field", () => {
	const cells = serializeLayoutCells(
		[
			{
				x: 0,
				y: 0,
				type: "storage",
				capacity: 1,
				zone: { id: "saved", name: "Зона", categoryId: "category" },
			},
			{
				x: 1,
				y: 0,
				type: "storage",
				capacity: 1,
				zone: { id: "new", name: "Новая", categoryId: "new-category" },
			},
			{ x: 2, y: 0, type: "aisle", capacity: 0 },
		],
		new Set(["saved"]),
	);

	expect(cells.map((cell) => cell.zone)).toEqual([
		{ id: "saved", name: "Зона", category_id: "category" },
		{ client_id: "new", name: "Новая", category_id: "new-category" },
		null,
	]);
});

test("reading zones uses categoryId and accepts an omitted zone without inventing one", () => {
	const layout = layoutDto.parse({
		width: 2,
		height: 1,
		cells: [
			{
				x: 0,
				y: 0,
				kind: "storage_general",
				capacity_volume: 1,
				zone: { id: "z", name: "Зона", categoryId: "c" },
			},
			{ x: 1, y: 0, kind: "aisle", capacity_volume: 0 },
		],
		routes: [],
	});

	expect(layout.cells[0]?.zone?.categoryId).toBe("c");
	expect(layout.cells[1]?.zone).toBeUndefined();
	expect(
		layoutDto.safeParse({
			...layout,
			cells: [{ ...layout.cells[0], zone: null }],
		}).success,
	).toBe(false);
});
