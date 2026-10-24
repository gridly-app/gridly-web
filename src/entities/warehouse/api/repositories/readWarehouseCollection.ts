import { z } from "zod";
import { type HttpClient, parseResponse } from "@/shared/api";

export async function readWarehouseCollection<T>(
	http: HttpClient,
	path: string,
	schema: z.ZodType<T>,
	signal?: AbortSignal,
): Promise<T[]> {
	const items: T[] = [];

	for (let offset = 0; ; offset += 100) {
		const page = parseResponse(
			z.union([
				z.array(schema),
				z.object({
					items: z.array(schema),
					total: z.number().int().nonnegative(),
				}),
			]),
			await http.request(
				`${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`,
				{ signal },
			),
		);

		if (Array.isArray(page)) {
			items.push(...page);

			if (!/\/(orders|events)(?:\?|$)/.test(path) || page.length < 100) {
				return items;
			}
			continue;
		}
		items.push(...page.items);
		if (items.length >= page.total || page.items.length < 100) {
			return items;
		}
	}
}
