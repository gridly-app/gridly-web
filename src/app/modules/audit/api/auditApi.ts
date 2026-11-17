import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import type { AuditEvent } from "@/domain/shipment";
import { adminQueryKey } from "@/ports/administration";
import { useWarehouseScopeId } from "@/ports/warehouse";

import type { HttpClient } from "@/shared/http";

import { readAuditPage } from "./auditPageApi";

export function useAuditEvents(
	http: HttpClient,
	path: string,
	{ enabled = true, loadAll = true } = {},
) {
	const scopeId = useWarehouseScopeId();
	const query = useInfiniteQuery({
		queryKey: adminQueryKey(scopeId, path),
		initialPageParam: 0,
		queryFn: ({ pageParam, signal }) =>
			readAuditPage(http, path, pageParam, signal),
		getNextPageParam: (page, _pages, offset) => {
			const nextOffset = offset + page.items.length;

			return nextOffset < page.total ? nextOffset : undefined;
		},
		enabled,
		retry: false,
	});
	const { data, fetchNextPage, hasNextPage, isFetching, isError } = query;
	const events = useMemo(() => {
		if (!data) return;

		const byId = new Map<string, AuditEvent>();

		for (const page of data.pages) {
			for (const event of page.items) byId.set(event.id, event);
		}

		return [...byId.values()];
	}, [data]);

	useEffect(() => {
		if (enabled && loadAll && hasNextPage && !isFetching && !isError) {
			void fetchNextPage({ cancelRefetch: false });
		}
	}, [enabled, loadAll, hasNextPage, isFetching, isError, fetchNextPage]);

	const initialTotal = data?.pages[0]?.total;
	const hasChanged = Boolean(
		data &&
		events &&
		(data.pages.some(({ total }) => total !== initialTotal) ||
			(!hasNextPage && events.length !== initialTotal)),
	);

	const isComplete =
		query.isSuccess && !isFetching && !hasNextPage && !hasChanged;
	const snapshot = isComplete ? data?.pages : undefined;

	return { query, events, hasChanged, isComplete, snapshot };
}
