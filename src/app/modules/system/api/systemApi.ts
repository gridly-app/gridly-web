import { useQuery } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import type { OrderLocation } from "@/ports/navigation";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import {
	dateRangeError,
	errorMessage,
	UserError,
	zonedDayBoundary,
} from "@/shared/lib";

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

	if ((from || to) && !timeZone)
		throw new UserError("Дождитесь загрузки часового пояса склада.");
	if (from && timeZone) params.set("from", zonedDayBoundary(from, timeZone));
	if (to && timeZone) params.set("to", zonedDayBoundary(to, timeZone, true));

	return `${path}?${params}`;
}

function resolveSystemUrl(path: string, filters: SystemFilters) {
	const rangeError = dateRangeError(filters.from, filters.to);

	if (rangeError) return { url: path, rangeError };

	try {
		return { url: systemQueryUrl(path, filters), rangeError: null };
	} catch (error) {
		return { url: path, rangeError: errorMessage(error) };
	}
}

export function useSystemStatus(
	http: HttpClient,
	path: string,
	filters: SystemFilters,
) {
	const scopeId = useWarehouseScopeId();
	const { url, rangeError } = resolveSystemUrl(path, filters);

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
