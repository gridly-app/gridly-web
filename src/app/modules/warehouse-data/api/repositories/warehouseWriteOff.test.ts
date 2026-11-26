import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import type { WarehouseCommand } from "@/domain/warehouse";
import { httpDouble } from "../../../../../../tests/support/http";
import { warehouse } from "../../../../../../tests/support/warehouse";
import { RestWarehouseRepository } from "./restRepository";

test("retrying a write-off after a lost response keeps the same idempotency key", async () => {
	const cache = new QueryClient();
	const keys = new Set<string>();
	const requests: string[] = [];
	let remaining = 10;
	const repository = new RestWarehouseRepository(
		httpDouble({
			request: async (path, options) => {
				expect(path).toBe("/warehouses/w/inventory/write-offs");
				expect(options?.method).toBe("POST");
				expect(options?.body).toEqual({
					stock_id: "s",
					revision: undefined,
					quantity: 2,
					reason: "Damage",
				});

				const key = options?.idempotencyKey;
				if (!key) throw new Error("Missing idempotency key");

				requests.push(key);
				if (keys.has(key)) return { written_off: true };

				keys.add(key);
				remaining -= 2;

				throw new TypeError("Lost acknowledgement");
			},
		}),
		cache,
	);
	const command: WarehouseCommand = {
		action: "writeoff",
		value: { id: "s", quantity: 2, reason: "Damage" },
	};

	try {
		const snapshot = warehouse();
		cache.setQueryData(repository.keys.resource("w", "metadata"), snapshot);
		cache.setQueryData(repository.keys.resource("w", "inventory"), {
			stock: snapshot.stock,
		});

		await expect(repository.execute("w", command)).rejects.toThrow(
			"Lost acknowledgement",
		);
		await expect(repository.execute("w", command)).resolves.toEqual({
			id: "w",
			applied: true,
		});

		expect(requests).toEqual([expect.any(String), requests[0]]);
		expect(remaining).toBe(8);
	} finally {
		repository.clear();
		cache.clear();
	}
});
