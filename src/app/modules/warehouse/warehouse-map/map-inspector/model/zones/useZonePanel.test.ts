import { expect, test } from "bun:test";
import { act, createElement } from "react";

import type { Cell } from "@/domain/warehouse";
import { UserError } from "@/shared/lib";
import { mountDom } from "../../../../../../../../tests/support/dom";
import { useZonePanel } from "./useZonePanel";

test("an inspector draft error preserves selected cells and retry affects only that selection", async () => {
	const dom = mountDom();
	const zone = { id: "zone", name: "Food", categoryId: "products" };
	const cells: [Cell, Cell] = [
		{ x: 1, y: 2, type: "storage", zone },
		{ x: 2, y: 2, type: "storage", zone },
	];
	const drafts: Cell[][] = [];
	let unavailable = true;
	let panel: ReturnType<typeof useZonePanel> | undefined;

	function Zone() {
		panel = useZonePanel({
			warehouse: { categories: [] },
			cells,
			keys: ["1,2"],
			editing: true,
			command: async () => {
				throw new Error("Unexpected warehouse write");
			},
			onDraft: (draft) => {
				if (unavailable) throw new UserError("Изменения временно недоступны.");

				drafts.push(draft);
			},
			onCategory: () => {
				throw new Error("Unexpected category change");
			},
		});

		return createElement("form", { onSubmit: panel.save });
	}

	function read() {
		if (!panel) throw new Error("Zone inspector did not mount");

		return panel;
	}

	async function submit() {
		const form = document.querySelector("form");
		if (!form) throw new Error("Zone inspector did not render a form");

		await act(async () => {
			form.dispatchEvent(
				new Event("submit", { bubbles: true, cancelable: true }),
			);
		});
	}

	try {
		act(() => dom.root.render(createElement(Zone)));
		await submit();

		expect(read().error).toBe("Изменения временно недоступны.");
		expect(read().picked).toEqual([cells[0]]);
		expect(drafts).toEqual([]);

		unavailable = false;

		await submit();

		expect(read().error).toBe("");
		expect(drafts).toHaveLength(1);
		expect(drafts[0]?.[0]?.zone).toMatchObject({
			name: "Food · часть зоны",
			categoryId: "products",
		});
		expect(drafts[0]?.[0]?.zone?.id).not.toBe(zone.id);
		expect(drafts[0]?.[1]).toBe(cells[1]);
	} finally {
		await dom.close();
	}
});
