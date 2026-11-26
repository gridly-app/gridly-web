import { expect, test } from "bun:test";
import { act, createElement } from "react";

import { WarehouseScopeProvider } from "@/ports/warehouse";
import { mountDom } from "../../../../../../tests/support/dom";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { useHistoryPage } from "./useHistoryPage";

test("the history day is local to its warehouse and excludes another warehouse", async () => {
	const dom = mountDom();
	const snapshot = {
		...warehouse(),
		timezone: "Europe/Moscow",
		events: [
			{
				id: "previous",
				title: "Previous",
				time: "2026-11-11T20:59:59Z",
				detail: "",
			},
			{ id: "first", title: "First", time: "2026-11-11T21:00:00Z", detail: "" },
			{ id: "last", title: "Last", time: "2026-11-12T20:59:59Z", detail: "" },
			{
				id: "other",
				title: "Other",
				warehouseId: "another-warehouse",
				time: "2026-11-12T12:00:00Z",
				detail: "",
			},
		],
	};
	let model: ReturnType<typeof useHistoryPage> | undefined;

	function History() {
		model = useHistoryPage();

		return null;
	}

	function read() {
		if (!model) throw new Error("History page did not mount");

		return model;
	}

	try {
		act(() =>
			dom.root.render(
				createElement(WarehouseScopeProvider, {
					value: {
						warehouse: snapshot,
						resources: ["history"],
						execute: async () => {
							throw new Error("Unexpected mutation");
						},
						command: async () => {
							throw new Error("Unexpected command");
						},
						pending: false,
					},
					children: createElement(History),
				}),
			),
		);

		act(() => {
			read().setFrom("2026-11-12");
			read().setTo("2026-11-12");
		});

		expect(read().visibleEvents.map(({ id }) => id)).toEqual(["last", "first"]);
	} finally {
		await dom.close();
	}
});
