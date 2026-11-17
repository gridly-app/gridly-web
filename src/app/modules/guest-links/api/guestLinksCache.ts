import type { QueryClient } from "@tanstack/react-query";

import type { adminQueryKey } from "@/ports/administration";
import type { HttpClient } from "@/shared/http";

import type { CreatedGuestLink, GuestLinkList } from "./guestLink.dto";
import { guestLinksQueryOptions } from "./guestLinksApi";

export function createGuestLinksCache(
	client: QueryClient,
	http: HttpClient,
	path: string,
	queryKey: ReturnType<typeof adminQueryKey>,
) {
	const exactList = { queryKey, exact: true };
	const options = guestLinksQueryOptions(http, path, queryKey);

	function cancelRead() {
		return client.cancelQueries(exactList);
	}

	function refresh() {
		return client.fetchQuery({ ...options, staleTime: 0 });
	}

	function addIssued(link: CreatedGuestLink) {
		client.setQueryData<GuestLinkList>(queryKey, (current) => {
			const otherLinks =
				current?.items.filter(({ id }) => id !== link.id) ?? [];

			return { items: [link, ...otherLinks] };
		});
	}

	function invalidate() {
		return client.invalidateQueries(exactList);
	}

	return { cancelRead, refresh, addIssued, invalidate };
}
