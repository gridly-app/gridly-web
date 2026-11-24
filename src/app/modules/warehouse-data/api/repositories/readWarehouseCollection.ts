import { z } from "zod";

import { ApiError, type HttpClient, parseResponse } from "@/shared/http";
import { UserError } from "@/shared/invariants";

const pageSize = 100;
const orderLimit = 1000;
const orderLimitDetails = z.object({ limit: z.number(), total: z.number() });

export async function readWarehouseCollection<T>(
	http: HttpClient,
	path: string,
	schema: z.ZodType<T>,
	signal?: AbortSignal | undefined,
): Promise<T[]> {
	const [pathname = ""] = path.split("?", 1);
	const collection = pathname.slice(pathname.lastIndexOf("/") + 1);
	const pageSchema = z.object({
		items: z.array(schema),
		total: z.number().int().nonnegative(),
	});

	if (collection === "orders") {
		const response = await requestOrders(http, path, signal);
		const { items, total } = parseResponse(pageSchema, response);

		checkUniqueIds(items, new Set());

		if (items.length !== total || total > orderLimit) {
			throw invalidCollection(
				"Сервер вернул неполный список заказов. Обновите данные.",
			);
		}

		return items;
	}

	const legacyPageSchema = z.union([pageSchema, z.array(schema)]);
	const items: T[] = [];
	const seenIds = new Set<string>();
	const separator = path.includes("?") ? "&" : "?";
	let total: number | undefined;

	for (;;) {
		const url = `${path}${separator}limit=${pageSize}&offset=${items.length}`;
		const response = await http.request(url, { signal });
		const page = parseResponse(legacyPageSchema, response);
		const pageItems = Array.isArray(page) ? page : page.items;

		checkUniqueIds(pageItems, seenIds);
		items.push(...pageItems);

		if (Array.isArray(page)) {
			if (collection !== "events" || page.length < pageSize) return items;

			continue;
		}

		if (total !== undefined && page.total !== total) {
			throw invalidCollection(
				"Список изменился во время загрузки. Обновите данные.",
			);
		}

		total = page.total;

		if (items.length === total) return items;

		if (items.length > total || !page.items.length) {
			throw invalidCollection(
				"Сервер вернул неполный список. Обновите данные.",
			);
		}
	}
}

function checkUniqueIds(items: readonly unknown[], seenIds: Set<string>) {
	for (const item of items) {
		if (!item || typeof item !== "object" || !("id" in item)) continue;
		if (typeof item.id !== "string" && typeof item.id !== "number") continue;

		const id = String(item.id);

		if (seenIds.has(id)) {
			throw invalidCollection(
				"Сервер вернул повторяющиеся записи списка. Обновите данные.",
			);
		}

		seenIds.add(id);
	}
}

function invalidCollection(message: string) {
	return new ApiError(message, 502, "INVALID_RESPONSE");
}

async function requestOrders(
	http: HttpClient,
	path: string,
	signal?: AbortSignal,
) {
	try {
		return await http.request(path, { signal });
	} catch (error) {
		if (
			!(error instanceof ApiError) ||
			error.status !== 422 ||
			error.code !== "ORDER_LIST_LIMIT_EXCEEDED"
		) {
			throw error;
		}

		const { data } = orderLimitDetails.safeParse(error.details);
		const count = data ? ` (${data.total} при лимите ${data.limit})` : "";

		throw new UserError(
			`На складе слишком много заказов для загрузки списка${count}.`,
		);
	}
}
