import { expect, test } from "bun:test";
import { z } from "zod";
import { ApiError } from "@/shared/http";
import { readWarehouseCollection } from "./readWarehouseCollection";

test("loads the complete order collection in one request", async () => {
	const paths: string[] = [];
	const http = {
		request: async (path: string) => {
			paths.push(path);
			return { items: ["first", "last"], total: 2 };
		},
	};

	expect(await readWarehouseCollection(http, "/orders", z.string())).toEqual([
		"first",
		"last",
	]);
	expect(paths).toEqual(["/orders"]);
});

test("rejects a truncated collection instead of reporting complete data", async () => {
	const http = { request: async () => ({ items: [], total: 1 }) };

	await expect(
		readWarehouseCollection(http, "/orders", z.string()),
	).rejects.toThrow("неполный список");
});

test("duplicate records cannot masquerade as the complete order list", async () => {
	const http = {
		request: async () => ({
			items: [{ id: "same-order" }, { id: "same-order" }],
			total: 2,
		}),
	};

	await expect(
		readWarehouseCollection(http, "/orders", z.object({ id: z.string() })),
	).rejects.toThrow("повторяющиеся");
});

test("explains a server order cap without returning a partial list", async () => {
	const http = {
		request: async () => {
			throw new ApiError("Limit", 422, "ORDER_LIST_LIMIT_EXCEEDED", {
				limit: 1000,
				total: 1001,
			});
		},
	};

	await expect(
		readWarehouseCollection(http, "/orders", z.string()),
	).rejects.toThrow("1001 при лимите 1000");
});

test.each([
	{ next: { items: [{ id: "other" }], total: 3 }, message: "Список изменился" },
	{ next: { items: [], total: 2 }, message: "неполный список" },
	{ next: { items: [{ id: "first" }], total: 2 }, message: "повторяющиеся" },
	{
		next: { items: [{ missing: "id" }], total: 2 },
		message: "некорректные данные",
	},
])(
	"rejects an inconsistent inventory page: $message",
	async ({ next, message }) => {
		const paths: string[] = [];
		const requests = {
			request: async (path: string) => {
				paths.push(path);

				return paths.length === 1
					? { items: [{ id: "first" }], total: 2 }
					: next;
			},
		};

		await expect(
			readWarehouseCollection(
				requests,
				"/inventory?store=active",
				z.object({ id: z.string() }),
			),
		).rejects.toThrow(message);
		expect(paths).toEqual([
			"/inventory?store=active&limit=100&offset=0",
			"/inventory?store=active&limit=100&offset=1",
		]);
	},
);
