import { expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { BrowserSessionRepository } from "@/app/modules/session";
import { RestWarehouseRepository } from "@/app/modules/warehouse-data";
import { memoryStorage } from "@/shared/browser";
import { channel, until } from "./liveStreamFixture";
import {
	warehouseDto,
	warehouseRepositoryFixture,
} from "./warehouseRepositoryFixture";

test("a new account opening the same warehouse ignores the old read and write and closes its stream", async () => {
	const cache = new QueryClient();
	const base = warehouseRepositoryFixture();
	const readStarted = Promise.withResolvers<void>();
	const writeStarted = Promise.withResolvers<void>();
	const releaseRead = Promise.withResolvers<void>();
	const releaseWrite = Promise.withResolvers<void>();
	const streams: ReturnType<typeof channel>[] = [];
	let account = "first";
	let holdRead = false;

	const repository = new RestWarehouseRepository(
		{
			async request(path, options) {
				if (path === "/warehouses/w1") {
					const name = account;
					if (holdRead) {
						holdRead = false;
						readStarted.resolve();
						await releaseRead.promise;
					}

					return { ...warehouseDto, name, allowed_actions: ["save-map"] };
				}
				if (path.endsWith("/layout/commit") && options?.method === "POST") {
					writeStarted.resolve();
					await releaseWrite.promise;

					return undefined;
				}

				return base.http.request(path, options);
			},
			async openStream() {
				const connection = channel();

				streams.push(connection);

				return connection.stream;
			},
		},
		cache,
	);
	const session = new BrowserSessionRepository(
		{
			clearSession() {},
			async request() {
				return { user: { login: account } };
			},
		},
		memoryStorage(),
		() => repository.clear(),
	);

	await session.authenticate("login", { login: "first", password: "fixture" });
	await repository.get("w1", undefined, "map");
	const firstKeys = repository.keys;
	const releaseFirst = repository.subscribeLive("w1");

	try {
		await until(() => streams.length === 1);
		holdRead = true;
		const staleRead = repository.get("w1").catch((error: unknown) => error);
		await readStarted.promise;
		const staleWrite = repository
			.execute("w1", {
				action: "saveMap",
				value: {
					baseVersion: 1,
					cells: [{ x: 1, y: 1, type: "wall" }],
					routes: [],
				},
			})
			.catch((error: unknown) => error);
		await writeStarted.promise;
		expect(cache.getQueryData(firstKeys.layoutOperation("w1"))).toMatchObject({
			status: "sending",
		});

		account = "second";
		await session.authenticate("login", {
			login: "second",
			password: "fixture",
		});
		const secondKeys = repository.keys;
		await repository.get("w1", undefined, "map");
		const releaseSecond = repository.subscribeLive("w1");

		try {
			await until(() => streams.length === 2 && streams[0]?.canceled === true);
			expect(secondKeys.detail("w1")).not.toEqual(firstKeys.detail("w1"));
			releaseRead.resolve();
			releaseWrite.resolve();

			expect(await staleRead).toMatchObject({ name: "AbortError" });
			expect(await staleWrite).toMatchObject({ name: "AbortError" });
			expect(cache.getQueryData(secondKeys.detail("w1"))).toMatchObject({
				name: "second",
				draft: null,
			});
			expect(
				cache.getQueryData(secondKeys.layoutOperation("w1")),
			).toBeUndefined();
			expect(cache.getQueryData(firstKeys.detail("w1"))).toBeUndefined();
			expect(
				cache.getQueryData(firstKeys.layoutOperation("w1")),
			).toBeUndefined();
		} finally {
			releaseSecond();
		}
	} finally {
		releaseRead.resolve();
		releaseWrite.resolve();
		releaseFirst();
		repository.clear();
		cache.clear();
	}
});
