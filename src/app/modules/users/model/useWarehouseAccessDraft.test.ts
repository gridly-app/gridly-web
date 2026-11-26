import { expect, test } from "bun:test";
import { act, createElement } from "react";

import { mountDom } from "../../../../../tests/support/dom";
import { useWarehouseAccessDraft } from "./useWarehouseAccessDraft";

test("editing rights at one warehouse leaves another assignment intact", async () => {
	const dom = mountDom();
	const local = {
		warehouse_id: "west",
		warehouse_name: "West",
		permissions: ["warehouse.view"],
	};
	const other = {
		warehouse_id: "east",
		warehouse_name: "East",
		permissions: ["warehouse.view", "run"],
	};
	let draft: ReturnType<typeof useWarehouseAccessDraft> | undefined;

	function Access() {
		draft = useWarehouseAccessDraft([local, other]);

		return null;
	}

	function read() {
		if (!draft) throw new Error("Access draft did not mount");

		return draft;
	}

	try {
		act(() => dom.root.render(createElement(Access)));
		act(() =>
			read().handleAccessChange("west", "West", ["warehouse.view", "run"]),
		);

		expect(read().hasAccessChanges).toBe(true);
		expect(read().assigned.get("east")).toEqual(other);
		expect(read().assigned.get("west")?.permissions).toEqual([
			"warehouse.view",
			"run",
		]);

		act(() => read().handleAccessChange("west", "West", ["warehouse.view"]));

		expect(read().hasAccessChanges).toBe(false);
		expect(read().assigned.get("east")).toEqual(other);
	} finally {
		await dom.close();
	}
});
