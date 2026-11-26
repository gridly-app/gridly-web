import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { AuditEvent } from "@/domain/shipment";
import { adminQueryKey } from "@/ports/administration";
import { useWarehouseScopeId } from "@/ports/warehouse";
import type { HttpClient } from "@/shared/http";

import { readAuditPage } from "./auditPageApi";

const firstCursor: string | null = null;

function uniqueById(events: AuditEvent[]) {
	const byId = new Map<string, AuditEvent>();

	for (const event of events) {
		if (!byId.has(event.id)) byId.set(event.id, event);
	}

	return [...byId.values()];
}

export function useAuditEvents(
	http: HttpClient,
	path: string,
	{ enabled = true, filters = "" } = {},
) {
	const scopeId = useWarehouseScopeId();
	const query = useInfiniteQuery({
		queryKey: [...adminQueryKey(scopeId, path), filters],
		initialPageParam: firstCursor,
		queryFn: ({ pageParam, signal }) =>
			readAuditPage(http, path, filters, pageParam, signal),
		getNextPageParam: (page, _pages, _cursor, cursors) => {
			const next = page.next_cursor;

			return next && !cursors.includes(next) ? next : undefined;
		},
		enabled,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: Infinity,
		gcTime: 0,
	});
	const { data } = query;
	const events = useMemo(
		() => data && uniqueById(data.pages.flatMap((page) => page.items)),
		[data],
	);

	return {
		query,
		events,
		total: data?.pages.at(-1)?.total,
		isComplete: query.isSuccess && !query.hasNextPage,
	};
}
