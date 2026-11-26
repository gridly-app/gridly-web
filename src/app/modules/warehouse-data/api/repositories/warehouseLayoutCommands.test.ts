import { describe, expect, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { httpDouble } from "../../../../../../tests/support/http";

import { RestWarehouseRepository } from "./restRepository";

import { ApiError, type RequestOptions } from "@/shared/http";

import {
	warehouseDto,
	warehouseRepositoryFixture,
} from "./warehouseRepository.test-support";

describe("REST warehouse layout commands", () => {
	test("missing routes after a confirmed commit require another read rather than another commit", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		let writes = 0;
		const repository = new RestWarehouseRepository(
			httpDouble({
				request: async (path, options) => {
					if (path === "/warehouses/w1?include_summary=true")
						return { ...warehouseDto, allowed_actions: ["save-map"] };
					if (path.endsWith("/layout/commit")) {
						writes++;
						return { version: 1 };
					}

					if (writes && path.endsWith("/layout"))
						return { version: 1, width: 3, height: 3, cells: [] };

					return base.http.request(path, options);
				},
			}),
			cache,
		);

		try {
			await repository.get("w1", undefined, "map");
			await repository.get("w1", undefined, "catalog");
			await repository.execute("w1", {
				action: "saveMap",
				value: {
					baseVersion: 1,
					cells: [],
					routes: [{ id: "route", keys: ["0,0"], inbound: [], outbound: [] }],
				},
			});

			expect(
				cache.getQueryData(repository.keys.layoutOperation("w1")),
			).toMatchObject({ status: "refresh-failed" });

			await repository.retryLayoutRead("w1");

			expect(writes).toBe(1);
			expect(
				cache.getQueryData(repository.keys.layoutOperation("w1")),
			).toMatchObject({ status: "refresh-failed" });
		} finally {
			repository.clear();
			cache.clear();
		}
	});

	test("an interrupted commit replays the exact captured request, then only rereads", async () => {
		const base = warehouseRepositoryFixture();
		const writes: RequestOptions[] = [];
		const repository = new RestWarehouseRepository(
			httpDouble({
				request: async (path, options) => {
					if (path === "/warehouses/w1?include_summary=true")
						return { ...warehouseDto, allowed_actions: ["save-map"] };
					if (path.endsWith("/layout/commit") && options) {
						writes.push(options);

						if (writes.length === 1) throw new TypeError("Lost response");

						return {};
					}

					return base.http.request(path, options);
				},
			}),
		);
		const command = {
			action: "saveMap" as const,
			value: { baseVersion: 1, cells: [], routes: [] },
		};

		try {
			await repository.get("w1", undefined, "map");
			await repository.get("w1", undefined, "catalog");
			await expect(repository.execute("w1", command)).rejects.toThrow(
				"Lost response",
			);

			await repository.retryLayoutRead("w1");

			expect(writes).toHaveLength(2);
			expect(writes[0]?.idempotencyKey).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(writes[1]?.idempotencyKey).toBe(writes[0]?.idempotencyKey);
			expect(writes[1]?.body).toEqual(writes[0]?.body);
		} finally {
			repository.clear();
		}
	});

	test("publication sends the version and the draft revision of the submitted snapshot", async () => {
		const base = warehouseRepositoryFixture();
		const cache = new QueryClient();
		const writes: Array<{ path: string; options: RequestOptions }> = [];
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (path === "/warehouses/w1?include_summary=true")
						return { ...warehouseDto, allowed_actions: ["save-map"] };
					if (options?.method === "POST" && path.endsWith("/layout/commit")) {
						writes.push({ path, options });

						return { version: 2 };
					}

					return base.http.request(path, options);
				},
			}),
			cache,
		);

		await repository.get("w1", undefined, "map");
		await repository.get("w1", undefined, "catalog");
		const catalogKey = repository.keys.resource("w1", "catalog");

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
		expect(cache.getQueryState(catalogKey)?.isInvalidated).toBe(true);
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
		let holdOldRead = false;
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (path === "/warehouses/w1?include_summary=true") {
						return {
							...warehouseDto,
							published_version: version,
							allowed_actions: ["save-map"],
						};
					}
					if (path.endsWith("/layout"))
						return { version, width: 3, height: 3, cells: [], routes: [] };
					if (path.endsWith("/layout/draft") && !holdOldRead)
						return {
							version,
							revision: 1,
							width: 3,
							height: 3,
							cells: [],
							routes: [],
						};
					if (path.endsWith("/layout/draft") && holdOldRead) {
						holdOldRead = false;
						started.resolve();
						await release.promise;
					}
					if (path.endsWith("/layout/commit") && options?.method === "POST") {
						version = 2;
						return undefined;
					}
					return base.http.request(path, options);
				},
			}),
			cache,
		);

		await repository.get("w1", undefined, "map");
		await repository.get("w1", undefined, "catalog");
		holdOldRead = true;
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
		expect(
			cache.getQueryData(repository.keys.resource("w1", "metadata")),
		).toMatchObject({
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
			httpDouble({
				async request(path, options) {
					if (path === "/warehouses/w1?include_summary=true") {
						return {
							...warehouseDto,
							published_version: publishedVersion,
							allowed_actions: ["save-map"],
						};
					}

					if (path === "/warehouses/w2?include_summary=true") {
						return {
							...warehouseDto,
							id: "w2",
							name: "Second warehouse",
							published_version: 7,
						};
					}

					if (path === "/warehouses/w1/layout/draft") {
						if (delayRead) {
							delayRead = false;
							reading.resolve();
							await releaseRead.promise;
						}

						return {
							version: publishedVersion,
							revision: 1,
							width: 3,
							height: 3,
							cells: [],
							routes: [],
						};
					}

					if (path === "/warehouses/w2/layout") {
						return {
							version: 7,
							width: 3,
							height: 3,
							cells: [{ x: 0, y: 0, kind: "charging", capacity_volume: 0 }],
							routes: [],
						};
					}

					if (path === "/warehouses/w1/layout") {
						return {
							version: publishedVersion,
							width: 3,
							height: 3,
							cells: [],
							routes: [],
						};
					}

					if (path === "/warehouses/w1/layout/commit") {
						writing.resolve();
						await releaseWrite.promise;
						publishedVersion = 2;

						return undefined;
					}

					return base.http.request(path, options);
				},
			}),
			cache,
		);

		await repository.get("w1", undefined, "map");
		await repository.get("w1", undefined, "catalog");
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

			expect(current.version).toBe(7);
			expect(current.cells[0]).toMatchObject({ x: 0, y: 0, type: "charge" });
			releaseWrite.resolve();
			await oldWrite;
		} finally {
			releaseWrite.resolve();
			releaseRead.resolve();
		}

		expect(await oldRead).toMatchObject({ name: "AbortError" });
		expect(
			cache.getQueryData(repository.keys.resource("w1", "metadata")),
		).toMatchObject({
			id: "w1",
			version: 2,
		});
		expect(
			cache.getQueryData(repository.keys.resource("w2", "map")),
		).toMatchObject({
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
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (path === "/warehouses/w1?include_summary=true")
						return { ...warehouseDto, allowed_actions: ["resize"] };
					if (options?.method === "POST" && path.endsWith("/layout/resize")) {
						writes.push(options.body);
						throw lostResponse;
					}

					return base.http.request(path, options);
				},
			}),
		);

		await repository.get("w1", undefined, "map");
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
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (path.endsWith("/layout/draft")) {
						if (options?.method === "DELETE") {
							deleted = options;
							throw new ApiError("Draft has changed", 409);
						}
						return {
							version: 1,
							revision: 5,
							width: 3,
							height: 3,
							cells: [],
							routes: [],
						};
					}
					return base.http.request(path, options);
				},
			}),
		);
		expect((await repository.get("w1", undefined, "map")).draftRevision).toBe(
			5,
		);
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
		const fixture = warehouseRepositoryFixture();
		const repository = new RestWarehouseRepository(
			httpDouble({
				async request(path, options) {
					if (options?.method !== "POST")
						return fixture.http.request(path, options);

					body = options.body;
					return [];
				},
			}),
		);
		await repository.get("w1", undefined, "map");
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
