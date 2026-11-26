import { queryOptions, useQuery } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import { guestLinksSchema } from "./guestLink.dto";

export function useGuestLinksQueryKey(path: string) {
	const scopeId = useWarehouseScopeId();

	return adminQueryKey(scopeId, path);
}

export function useGuestLinks(http: HttpClient, path: string) {
	const queryKey = useGuestLinksQueryKey(path);

	return useQuery(guestLinksQueryOptions(http, path, queryKey));
}

export function guestLinksQueryOptions(
	http: HttpClient,
	path: string,
	queryKey: ReturnType<typeof adminQueryKey>,
) {
	return queryOptions({
		queryKey,
		queryFn: async ({ signal }) => {
			const response = await http.request(path, { signal, privacy: true });

			return parseResponse(guestLinksSchema, response);
		},
		retry: false,
	});
}
