import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { useWarehouseScopeId } from "@/ports/warehouse";

import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { UserError } from "@/shared/lib";
import { adminQueryKey } from "@/ports/administration";

import type { AuditEvent } from "@/domain/shipment";

import { auditSchema } from "./audit.dto";

const batchSize = 200;

async function readAuditPage(
	http: FetchHttpClient,
	path: string,
	offset: number,
	signal?: AbortSignal,
) {
	const url = `${path}?limit=${batchSize}&offset=${offset}`;
	const response = await http.request(url, { signal });
	const page = parseResponse(auditSchema, response);

	if (!page.items.length && offset < page.total) {
		throw new UserError("Журнал изменился во время загрузки. Обновите журнал.");
	}

	return page;
}

type AuditPage = Awaited<ReturnType<typeof readAuditPage>>;

export function useVerifyAuditExport(http: FetchHttpClient, path: string) {
	return useMutation({
		mutationFn: async (pages: AuditPage[]) => {
			async function verifyPage(expected: AuditPage, offset: number) {
				const current = await readAuditPage(http, path, offset);

				if (JSON.stringify(current) !== JSON.stringify(expected)) {
					throw new UserError(
						"Журнал изменился после загрузки. Обновите журнал и повторите экспорт.",
					);
				}
			}

			let offset = 0;

			for (const page of pages) {
				await verifyPage(page, offset);
				offset += page.items.length;
			}

			const firstPage = pages[0];

			if (firstPage && pages.length > 1) await verifyPage(firstPage, 0);
		},
	});
}

export function useAuditEvents(
	http: FetchHttpClient,
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

	return { query, events, hasChanged };
}
