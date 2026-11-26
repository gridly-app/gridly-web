import { expect, test } from "bun:test";
import { act, createElement } from "react";

import type { CommandExecutor } from "@/domain/warehouse";
import { memoryStorage } from "@/shared/lib";
import { mountDom } from "../../../../../../tests/support/dom";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { OrderFormDrafts } from "./orderFormDrafts";
import { useOrderCreation } from "./useOrderCreation";

test("an interrupted order keeps its local form and a confirmed retry removes it once", async () => {
	const dom = mountDom();
	const snapshot = warehouse();
	const drafts = new OrderFormDrafts(
		memoryStorage(),
		["account"],
		snapshot.id,
		"inbound",
	);
	const saved = {
		id: "saved-order",
		updatedAt: "2026-11-12T00:00:00Z",
		values: {
			party: "Supplier",
			manual: snapshot.policy,
			lines: [{ product: "p", key: "line", quantity: "2", expires: "" }],
		},
	};
	const input = {
		kind: "inbound",
		party: "Supplier",
		manual: snapshot.policy,
		lines: [{ product: "p", quantity: 2, expires: "" }],
	} as const;
	const order = { ...input, lines: [...input.lines] };
	const attempts: (string | undefined)[] = [];
	let response = Promise.withResolvers<void>();
	let model: ReturnType<typeof useOrderCreation> | undefined;

	const execute: CommandExecutor = async (action, ...[value, options]) => {
		expect<unknown>({ action, value }).toEqual({
			action: "order",
			value: order,
		});

		attempts.push(options?.operationId);

		return response.promise;
	};

	function Creation() {
		model = useOrderCreation(snapshot, execute, drafts);

		return null;
	}

	function read() {
		if (!model) throw new Error("Order creation did not render");

		return model;
	}

	try {
		const [form] = drafts.save(saved);
		if (!form) throw new Error("Missing saved form");

		act(() => dom.root.render(createElement(Creation)));
		act(() => read().restoreForm(form));
		await act(async () => {
			const pending = read().createDraft(order);

			await read().createDraft(order);
			response.reject(new TypeError("Request interrupted"));

			await expect(pending).rejects.toThrow("Request interrupted");
		});

		expect(attempts).toEqual(["saved-order"]);
		expect(drafts.read()).toEqual([form]);
		expect(read().creation?.values).toEqual(form.values);

		response = Promise.withResolvers<void>();
		await act(async () => {
			const pending = read().createDraft(order);

			response.resolve();
			await pending;
		});

		expect(attempts).toEqual(["saved-order", "saved-order"]);
		expect(drafts.read()).toEqual([]);
		expect(read().creation).toBeNull();
	} finally {
		await dom.close();
	}
});
