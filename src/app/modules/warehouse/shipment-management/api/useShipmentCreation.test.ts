import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";

import { ApiError } from "@/shared/http";

import { mountDom } from "../../../../../../tests/support/dom";
import {
	type ShipmentCreationAccess,
	useShipmentCreation,
} from "./useShipmentCreation";

async function withCreation(
	run: (creation: () => ShipmentCreationAccess) => Promise<void>,
) {
	const dom = mountDom();
	const cache = new QueryClient();
	let creation: ShipmentCreationAccess | undefined;

	function Creation() {
		creation = useShipmentCreation(["test-shipment"], null, async () => {});

		return null;
	}

	try {
		act(() =>
			dom.root.render(
				createElement(QueryClientProvider, {
					client: cache,
					children: createElement(Creation),
				}),
			),
		);

		await run(() => {
			if (!creation) throw new Error("Creation did not render");

			return creation;
		});
	} finally {
		await dom.close();
		cache.clear();
	}
}

const invalidState = new ApiError(
	"Операция недоступна в текущем статусе заказа",
	409,
	"INVALID_STATE",
);

test("a 409 for a new link is a rejection, not an unknown outcome", async () => {
	await withCreation(async (creation) => {
		await act(async () => {
			await expect(
				creation().create(
					"link",
					async () => {
						throw invalidState;
					},
					{},
				),
			).rejects.toBe(invalidState);
		});

		expect(creation().getAttempt()).toBeNull();
	});
});

test("a lost response for a new link keeps the attempt as unknown", async () => {
	await withCreation(async (creation) => {
		await act(async () => {
			await expect(
				creation().create(
					"link",
					async () => {
						throw new TypeError("Failed to fetch");
					},
					{},
				),
			).rejects.toThrow("Failed to fetch");
		});

		expect(creation().getAttempt()?.status).toBe("unknown");
	});
});
