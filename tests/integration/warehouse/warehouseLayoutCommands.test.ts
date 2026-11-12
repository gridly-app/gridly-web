import { describe, expect, test } from "bun:test";
import { RestWarehouseRepository } from "@/entities/warehouse";

import { ApiError, type RequestOptions } from "@/shared/api";

import { warehouseRepositoryFixture } from "./warehouseRepositoryFixture";

describe("REST warehouse layout commands", () => {
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
