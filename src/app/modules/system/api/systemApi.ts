import { useQuery } from "@tanstack/react-query";

import { useWarehouseScopeId } from "@/ports/warehouse";

import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { adminQueryKey } from "@/ports/administration";

import type { OrderLocation } from "@/ports/navigation";
import { dateRangeError } from "@/shared/lib";
import { systemSchema } from "./system.dto";

type SystemFilters = {
	orderScope: OrderLocation | null;
	from: string;
	to: string;
};

function systemQueryUrl(path: string, { orderScope, from, to }: SystemFilters) {
	const params = new URLSearchParams();

	if (orderScope) {
		params.set("warehouse_id", orderScope.warehouseId);
		params.set("order_id", orderScope.orderId);
	}

	if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());

	if (to) {
		const nextDay = new Date(`${to}T00:00:00`);
		nextDay.setDate(nextDay.getDate() + 1);
		params.set("to", nextDay.toISOString());
	}

	return `${path}?${params}`;
}

export function useSystemStatus(
	http: FetchHttpClient,
	path: string,
	filters: SystemFilters,
) {
	const scopeId = useWarehouseScopeId();
	const rangeError = dateRangeError(filters.from, filters.to);
	const url = rangeError ? path : systemQueryUrl(path, filters);

	const query = useQuery({
		queryKey: adminQueryKey(scopeId, url),
		queryFn: async ({ signal }) => {
			const response = await http.request(url, { signal });

			return parseResponse(systemSchema, response);
		},
		enabled: !rangeError,
		retry: false,
	});

	return { query, rangeError };
}
