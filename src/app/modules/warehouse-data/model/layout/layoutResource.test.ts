import { expect, jest, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import type { LayoutCommand } from "@/domain/warehouse";
import { ApiError } from "@/shared/http";
import { createWarehouseKeys } from "../queries/queryKeys";
import { LayoutResource } from "./layoutResource";

const warehouseKeys = createWarehouseKeys("layout-test");

const command: LayoutCommand = {
	action: "saveMap",
	value: { baseVersion: 4, draftRevision: 8, cells: [], routes: [] },
};

test("a lost response retains the sent command and blocks a second write for that warehouse", async () => {
	const cache = new QueryClient();
	const session = new AbortController();
	const failure = new TypeError("Network connection was lost");
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async () => undefined,
	);
	const write = async (_command: LayoutCommand, sent: () => void) => {
		sent();
		throw failure;
	};

	await expect(operations.execute("a", command, write)).rejects.toBe(failure);
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toEqual({
		command,
		status: "unknown",
	});
	await expect(operations.execute("a", command, write)).rejects.toThrow(
		"ещё не завершена",
	);
	expect(
		cache.getQueryData(warehouseKeys.layoutOperation("b")),
	).toBeUndefined();
});

test("a version conflict refreshes the published layout and keeps the submitted draft", async () => {
	const cache = new QueryClient();
	const session = new AbortController();
	const refreshed: string[] = [];
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async (id) => {
			refreshed.push(id);
		},
	);

	await expect(
		operations.execute("a", command, async (_command, sent) => {
			sent();
			throw new ApiError("Version changed", 412);
		}),
	).rejects.toMatchObject({ status: 412 });
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toEqual({
		command,
		status: "conflict",
	});
	expect(refreshed).toEqual(["a"]);
	operations.discardRejected("a");
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toBeNull();
});

test("retry after an acknowledged write only reads the current layout", async () => {
	const cache = new QueryClient();
	const session = new AbortController();
	let reads = 0;
	let writes = 0;
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async () => {
			reads++;
			if (reads === 1) throw new Error("Reading the current layout failed");
		},
	);

	await operations.execute("a", command, async (_command, sent) => {
		sent();
		writes++;
	});
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toEqual({
		command,
		status: "refresh-failed",
	});
	await operations.retryRead("a");
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toBeNull();
	expect([reads, writes]).toEqual([2, 1]);
});

test("an acknowledged write from a closed session cannot publish an operation to the new session", async () => {
	const cache = new QueryClient();
	const previous = new AbortController();
	let session = previous;
	const network = Promise.withResolvers<void>();
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async () => undefined,
	);
	const writing = operations.execute("a", command, async (_command, sent) => {
		sent();
		await network.promise;
	});

	previous.abort();
	cache.clear();
	session = new AbortController();
	network.resolve();

	await expect(writing).rejects.toMatchObject({ name: "AbortError" });
	expect(
		cache.getQueryData(warehouseKeys.layoutOperation("a")),
	).toBeUndefined();
});

test("validation retains field and cell identifiers with the rejected submission", async () => {
	const cache = new QueryClient();
	const session = new AbortController();
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async () => undefined,
	);
	const failure = new ApiError("Invalid layout", 422, undefined, {
		violations: [
			{ cell: { x: 1, y: 2 }, message: "Проезд занят" },
			{ field: "width", message: "Нужна большая ширина" },
			{ cell_key: "invalid", message: "Неверный идентификатор" },
		],
	});
	await expect(
		operations.execute("a", command, async (_command, sent) => {
			sent();
			throw failure;
		}),
	).rejects.toBe(failure);
	expect(cache.getQueryData(warehouseKeys.layoutOperation("a"))).toEqual({
		command,
		status: "rejected",
		issues: [
			{ kind: "cell", key: "1,2", message: "Проезд занят" },
			{ kind: "field", field: "width", message: "Нужна большая ширина" },
		],
	});
});

test("the commit cannot be replayed after its safe retry window", async () => {
	const cache = new QueryClient();
	const session = new AbortController();
	const operations = new LayoutResource(
		cache,
		() => session.signal,
		() => warehouseKeys,
		async () => {},
	);
	const replay = jest.fn(async () => {});

	jest.useFakeTimers();

	try {
		await expect(
			operations.execute("w", command, async (_command, sent) => {
				sent(replay);

				throw new TypeError("Lost response");
			}),
		).rejects.toThrow("Lost response");

		jest.advanceTimersByTime(24 * 60 * 60 * 1000);

		await expect(operations.retryRead("w")).rejects.toThrow(
			"Срок безопасного повтора истёк",
		);
		expect(replay).not.toHaveBeenCalled();
		expect(
			cache.getQueryData(warehouseKeys.layoutOperation("w")),
		).toMatchObject({ status: "unknown", command });
	} finally {
		jest.useRealTimers();
		cache.clear();
	}
});
