import { useQuery } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import type { OrderLocation } from "@/ports/navigation";
import { useWarehouseScopeId } from "@/ports/warehouse";

import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { dateRangeError, errorMessage, zonedDayBoundary } from "@/shared/lib";

import { systemSchema } from "./system.dto";

type SystemFilters = {
	orderScope: OrderLocation | null;
	from: string;
	to: string;
	timeZone: string | undefined;
};

export function systemQueryUrl(
	path: string,
	{ orderScope, from, to, timeZone }: SystemFilters,
) {
	const params = new URLSearchParams();

	if (orderScope) {
		params.set("warehouse_id", orderScope.warehouseId);
		params.set("order_id", orderScope.orderId);
	}

	if (from || to) {
		if (!timeZone) throw new Error("Дождитесь загрузки часового пояса склада.");
		if (from) params.set("from", zonedDayBoundary(from, timeZone));
		if (to) params.set("to", zonedDayBoundary(to, timeZone, true));
	}

	return `${path}?${params}`;
}

export function useSystemStatus(
	http: FetchHttpClient,
	path: string,
	filters: SystemFilters,
) {
	const scopeId = useWarehouseScopeId();
	let rangeError = dateRangeError(filters.from, filters.to);
	let url = path;

	if (!rangeError) {
		try {
			url = systemQueryUrl(path, filters);
		} catch (error) {
			rangeError = errorMessage(error);
		}
	}

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
