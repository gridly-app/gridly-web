import type { HttpClient, RequestOptions } from "@/shared/api";
import type { Warehouse } from "../../model/warehouse/schemas";

export type SendMutation = (
	path: string,
	options: RequestOptions,
	keyed?: boolean | undefined,
) => Promise<unknown>;

export interface RestCommandContext {
	warehouse: Warehouse;
	base: string;
	http: HttpClient;
	mutate: SendMutation;
	send: (
		path: string,
		body?: unknown | undefined,
		method?: RequestOptions["method"] | undefined,
		keyed?: boolean | undefined,
	) => Promise<unknown>;
}

export function requireRevision(revision?: number | undefined): number {
	if (revision === undefined) {
		throw new Error("API не вернул ревизию объекта. Обновите данные.");
	}

	return revision;
}
