import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseRepository } from "@/app/modules/warehouse-data";

import { ApiError, type RequestOptions } from "@/shared/http";

import {
	warehouseDto,
	warehouseRepositoryFixture,
} from "./warehouseRepositoryFixture";

describe("REST warehouse layout commands", () => {
	test("publication sends the version and the draft revision of the submitted snapshot", async () => {
		const base = warehouseRepositoryFixture();
		const writes: Array<{ path: string; options: RequestOptions }> = [];
		const repository = new RestWarehouseRepository({
			async request(path, options) {
				if (path === "/warehouses/w1")
					return { ...warehouseDto, allowed_actions: ["save-map"] };
				if (options?.method === "POST" && path.endsWith("/layout/commit")) {
					writes.push({ path, options });

					return { version: 2 };
				}

				return base.http.request(path, options);
			},
		});

		await repository.get("w1");
		const receipt = await repository.execute("w1", {
			action: "saveMap",
			value: {
				baseVersion: 1,
				draftRevision: 5,
				cells: [{ x: 1, y: 1, type: "aisle", capacity: 0 }],
				routes: [],
			},
		});

		expect(receipt).toEqual({ id: "w1", applied: true });
		expect(writes).toMatchObject([
			{
				path: "/warehouses/w1/layout/commit",
				options: {
					body: {
						base_version: 1,
						draft_revision: 5,
						cells: [
							{ x: 1, y: 1, kind: "aisle", capacity_volume: 0, zone: null },
						],
						routes: [],
					},
				},
			},
		]);
	});

	test("a map read started before publication cannot overwrite the confirmed version", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		const started = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		let version = 1;
		let holdOldDraft = false;
		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					if (path === "/warehouses/w1") {
						return {
							...warehouseDto,
							published_version: version,
							allowed_actions: ["save-map"],
						};
					}
					if (path.endsWith("/layout"))
						return { version, width: 3, height: 3, cells: [] };
					if (path.endsWith("/map/state")) {
						return {
							warehouse_id: "w1",
							layout_version: version,
							state_version: "1",
							tick: "1",
							robots: [],
						};
					}
					if (path.endsWith("/layout/commit") && options?.method === "POST") {
						version = 2;
						return undefined;
					}
					if (path.endsWith("/layout/draft") && holdOldDraft) {
						holdOldDraft = false;
						started.resolve();
						await release.promise;
						return { version: 1, revision: 3, width: 3, height: 3, cells: [] };
					}
					return base.http.request(path, options);
				},
			},
			cache,
		);

		await repository.get("w1");
		holdOldDraft = true;
		const oldRead = repository
			.get("w1", undefined, "map")
			.catch((error: unknown) => error);
		await started.promise;

		try {
			await repository.execute("w1", {
				action: "saveMap",
				value: { baseVersion: 1, cells: [], routes: [] },
			});
		} finally {
			release.resolve();
		}

		expect(await oldRead).toMatchObject({ name: "AbortError" });
		expect(cache.getQueryData(repository.keys.detail("w1"))).toMatchObject({
			version: 2,
		});
		expect(
			cache.getQueryData(repository.keys.resource("w1", "map")),
		).toMatchObject({ version: 2 });
	});

	test("late reads and writes stay with their warehouse after switching", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		const reading = Promise.withResolvers<void>();
		const writing = Promise.withResolvers<void>();
		const releaseRead = Promise.withResolvers<void>();
		const releaseWrite = Promise.withResolvers<void>();
		let delayRead = false;
		let publishedVersion = 1;

		const repository = new RestWarehouseRepository(
			{
				async request(path, options) {
					if (path === "/warehouses/w1") {
						return {
							...warehouseDto,
							published_version: publishedVersion,
							allowed_actions: ["save-map"],
						};
					}

					if (path === "/warehouses/w2") {
						return {
							...warehouseDto,
							id: "w2",
							name: "Second warehouse",
							published_version: 7,
						};
					}

					if (
						path === "/warehouses/w2/map/state" ||
						path === "/warehouses/w1/map/state"
					) {
						const second = path.includes("/w2/");
						return {
							warehouse_id: second ? "w2" : "w1",
							layout_version: second ? 7 : publishedVersion,
							state_version: "1",
							tick: "1",
							robots: [],
						};
					}

					if (path === "/warehouses/w2/layout") {
						return {
							version: 7,
							width: 3,
							height: 3,
							cells: [{ x: 0, y: 0, kind: "charging", capacity_volume: 0 }],
						};
					}

					if (path === "/warehouses/w1/layout") {
						return {
							version: publishedVersion,
							width: 3,
							height: 3,
							cells: [],
						};
					}

					if (path === "/warehouses/w1/layout/draft" && delayRead) {
						delayRead = false;
						reading.resolve();
						await releaseRead.promise;

						return { version: 1, revision: 3, width: 3, height: 3, cells: [] };
					}

					if (path === "/warehouses/w1/layout/commit") {
						writing.resolve();
						await releaseWrite.promise;
						publishedVersion = 2;

						return undefined;
					}

					return base.http.request(path, options);
				},
			},
			cache,
		);

		await repository.get("w1", undefined, "map");
		delayRead = true;
		const oldRead = repository
			.get("w1", undefined, "map")
			.catch((error: unknown) => error);
		await reading.promise;

		const oldWrite = repository.execute("w1", {
			action: "saveMap",
			value: { baseVersion: 1, cells: [], routes: [] },
		});
		await writing.promise;

		try {
			const current = await repository.get("w2", undefined, "map");

			expect(current).toMatchObject({ id: "w2", version: 7 });
			expect(current.cells[0]).toMatchObject({ x: 0, y: 0, type: "charge" });
			releaseWrite.resolve();
			await oldWrite;
		} finally {
			releaseWrite.resolve();
			releaseRead.resolve();
		}

		expect(await oldRead).toMatchObject({ name: "AbortError" });
		expect(cache.getQueryData(repository.keys.detail("w1"))).toMatchObject({
			id: "w1",
			version: 2,
		});
		expect(cache.getQueryData(repository.keys.detail("w2"))).toMatchObject({
			id: "w2",
			version: 7,
			draft: null,
		});
		expect(
			cache.getQueryData(repository.keys.layoutOperation("w2")),
		).toBeUndefined();
	});

	test("resize sends the published version and propagates a lost response", async () => {
		const base = warehouseRepositoryFixture();
		const lostResponse = new TypeError("Connection closed before the response");
		const writes: unknown[] = [];
		const repository = new RestWarehouseRepository({
			async request(path, options) {
				if (path === "/warehouses/w1")
					return { ...warehouseDto, allowed_actions: ["resize"] };
				if (options?.method === "POST" && path.endsWith("/layout/resize")) {
					writes.push(options.body);
					throw lostResponse;
				}

				return base.http.request(path, options);
			},
		});

		await repository.get("w1");
		await expect(
			repository.execute("w1", {
				action: "resize",
				value: { width: 17, height: 11 },
			}),
		).rejects.toBe(lostResponse);

		expect(writes).toEqual([{ width: 17, height: 11, base_version: 1 }]);
	});

	test("discard sends the revision of the draft opened by the operator", async () => {
		const base = warehouseRepositoryFixture();
		let deleted: RequestOptions | undefined;
		const repository = new RestWarehouseRepository({
			async request(path, options) {
				if (path.endsWith("/layout/draft")) {
					if (options?.method === "DELETE") {
						deleted = options;
						throw new ApiError("Draft has changed", 409);
					}
					return { version: 1, revision: 5, width: 3, height: 3, cells: [] };
				}
				return base.http.request(path, options);
			},
		});
		expect((await repository.get("w1")).draftRevision).toBe(5);
		await expect(
			repository.execute("w1", {
				action: "discard",
				value: { draftRevision: 4 },
			}),
		).rejects.toMatchObject({ status: 409 });
		expect(deleted?.headers).toEqual({ "If-Match": '"4"' });
	});

	test("route proposals preserve zone boundaries including new zones", async () => {
		let body: unknown;
		const repository = new RestWarehouseRepository({
			async request(_path, options) {
				body = options?.body;
				return [];
			},
		});
		await repository.proposeRoutes("w1", [
			{
				x: 0,
				y: 0,
				type: "storage",
				capacity: 20,
				zone: { id: "draft-a", name: "A", categoryId: "c1" },
			},
			{
				x: 1,
				y: 0,
				type: "storage",
				capacity: 20,
				zone: { id: "draft-b", name: "B", categoryId: "c1" },
			},
		]);
		expect(body).toMatchObject({
			cells: [
				{ zone: { client_id: "draft-a", name: "A", category_id: "c1" } },
				{ zone: { client_id: "draft-b", name: "B", category_id: "c1" } },
			],
		});
	});
});
