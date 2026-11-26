import { expect, test } from "bun:test";
import type { Cell } from "@/domain/warehouse";

import { assignedStorageCells, categoryStorageZones } from "./categoryStorage";

const category = { id: "cold", name: "Cold", cold: true };
const cells: Cell[] = [
	{
		x: 0,
		y: 0,
		type: "storage",
		capacity: 10,
		zone: { id: "free", name: "Free", categoryId: "" },
	},
	{
		x: 1,
		y: 0,
		type: "cold",
		capacity: 5,
		zone: { id: "assigned", name: "Assigned", categoryId: "cold" },
	},
	{
		x: 2,
		y: 0,
		type: "storage",
		capacity: 9,
		zone: { id: "other", name: "Other", categoryId: "other" },
	},
];

test("assigns only selected zones, preserves zero capacity, and leaves neighboring zones intact", () => {
	const data = new FormData();
	const zones = categoryStorageZones(category.id, cells);

	data.append("zone", "free");
	data.set("capacity:free", "0");

	const next = assignedStorageCells(data, cells, zones, category);

	expect(next).toMatchObject([
		{ type: "cold", capacity: 0, zone: { id: "free", categoryId: "cold" } },
		{ type: "cold", capacity: 5, zone: { id: "assigned", categoryId: "" } },
		{
			type: "storage",
			capacity: 9,
			zone: { id: "other", categoryId: "other" },
		},
	]);
	expect(next?.[2]).toBe(cells[2]);
	expect(cells[0]?.zone?.categoryId).toBe("");
});
