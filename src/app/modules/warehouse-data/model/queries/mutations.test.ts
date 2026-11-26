import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";

import { mountDom } from "../../../../../../tests/support/dom";
import { httpDouble } from "../../../../../../tests/support/http";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { WarehouseRepositoryProvider } from "../../WarehouseRepositoryProvider";
import { RestWarehouseRepository } from "../../api/repositories/restRepository";
import { useWarehouseCommand } from "./mutations";

test("a write that completes after a session switch cannot invalidate the new warehouse", async () => {
	const dom = mountDom();
	const cache = new QueryClient();
	const sent = Promise.withResolvers<void>();
	const reply = Promise.withResolvers<unknown>();
	const repository = new RestWarehouseRepository(
		httpDouble({
			request: () => {
				sent.resolve();

				return reply.promise;
			},
		}),
		cache,
	);
	const snapshot = warehouse();
	let mutation: ReturnType<typeof useWarehouseCommand> | undefined;

	function Commands() {
		mutation = useWarehouseCommand(snapshot.id, snapshot);

		return null;
	}

	function render(scope: string) {
		dom.root.render(
			createElement(QueryClientProvider, {
				client: cache,
				children: createElement(WarehouseRepositoryProvider, {
					repository,
					children: createElement(Commands, { key: scope }),
				}),
			}),
		);
	}

	try {
		act(() => render(repository.keys.scopeId));
		if (!mutation) throw new Error("Commands did not mount");

		const command = mutation;
		let completion: Promise<unknown> | undefined;

		await act(async () => {
			completion = command
				.mutateAsync({
					action: "writeoff",
					value: { id: "s", quantity: 2, reason: "Damage" },
				})
				.catch((error: unknown) => error);

			await sent.promise;
		});
		repository.clear();

		const current = { ...snapshot, name: "Current account warehouse" };
		const inventory = repository.keys.resource(snapshot.id, "inventory");

		cache.setQueryData(inventory, current);
		act(() => render(repository.keys.scopeId));

		await act(async () => {
			reply.resolve({ written_off: true });

			expect(await completion).toMatchObject({ name: "AbortError" });
		});

		expect(cache.getQueryData(inventory)).toEqual(current);
		expect(cache.getQueryState(inventory)?.isInvalidated).toBe(false);
	} finally {
		await dom.close();
		repository.clear();
		cache.clear();
	}
});
