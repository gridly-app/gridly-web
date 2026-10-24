import type { HttpClient, RequestOptions } from "@/shared/api";
import type { Warehouse } from "../../model/warehouse/schemas";

export type SendMutation = (
	path: string,
	options: RequestOptions,
	keyed?: boolean,
) => Promise<unknown>;

export interface RestCommandContext {
	warehouse: Warehouse;
	base: string;
	http: HttpClient;
	mutate: SendMutation;
	send: (
		path: string,
		body?: unknown,
		method?: RequestOptions["method"],
		keyed?: boolean,
	) => Promise<unknown>;
}

export function requireRevision(revision?: number): number {
	if (revision === undefined) {
		throw new Error("API не вернул ревизию объекта. Обновите данные.");
	}

	return revision;
}
