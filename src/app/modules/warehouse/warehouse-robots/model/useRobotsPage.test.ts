import { expect, test } from "bun:test";
import { act, createElement } from "react";

import type { Warehouse } from "@/domain/warehouse";
import { WarehouseDataProvider } from "@/ports/warehouse";
import { mountDom } from "../../../../../../tests/support/dom";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { warehouseData } from "../../../warehouse-data/model/warehouseData";
import { useRobotsPage } from "./useRobotsPage";

test("only unoccupied passable cells on a published map can start a robot", async () => {
	const dom = mountDom();
	const snapshot = warehouse();
	const occupied = { x: 0, y: 0, type: "aisle" } as const;
	const charge = { x: 1, y: 0, type: "charge" } as const;
	const wall = { x: 2, y: 0, type: "wall" } as const;
	let choices: ReturnType<typeof useRobotsPage>["spawnCells"] = [];

	function Robots() {
		choices = useRobotsPage().spawnCells;

		return null;
	}

	function show(published: Warehouse["published"]) {
		act(() =>
			dom.root.render(
				createElement(WarehouseDataProvider, {
					value: {
						...warehouseData,
						useLiveWarehouseScope: () => ({
							resources: ["map", "robots", "orders", "catalog"] as const,
							warehouse: {
								...snapshot,
								cells: [occupied, charge, wall],
								published,
							},
							execute: async () => {
								throw new Error("Unexpected robot write");
							},
							command: async () => {
								throw new Error("Unexpected command");
							},
							pending: false,
						}),
					},
					children: createElement(Robots),
				}),
			),
		);
	}

	try {
		show(true);

		expect(choices).toEqual([charge]);

		show(false);

		expect(choices).toEqual([]);
	} finally {
		await dom.close();
	}
});
