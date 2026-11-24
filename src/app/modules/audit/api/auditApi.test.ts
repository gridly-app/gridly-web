import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { adminQueryKey } from "@/ports/administration";
import { type WarehouseData, WarehouseDataProvider } from "@/ports/warehouse";

import type { AuditPage } from "./audit.dto";
import { useAuditEvents } from "./auditApi";
import { readAuditPage } from "./auditPageApi";

function unexpectedRequest(): never {
	throw new Error("Unexpected warehouse request");
}

const warehouseData: WarehouseData = {
	useScopeId: () => "scope-1",
	useLayoutOperation: unexpectedRequest,
	useWarehouses: unexpectedRequest,
	useWarehouse: unexpectedRequest,
	useWarehouseConnection: unexpectedRequest,
	useWarehouseLiveSubscription: unexpectedRequest,
	useOrder: unexpectedRequest,
	useWarehouseResources: unexpectedRequest,
	useLiveWarehouseScope: unexpectedRequest,
	useWarehouseCommand: unexpectedRequest,
	useCreateWarehouse: unexpectedRequest,
	useWarehouseCache: unexpectedRequest,
	useRouteProposal: unexpectedRequest,
	useSelectionSummary: unexpectedRequest,
};

const event = {
	id: "event-1",
	occurred_at: "2026-11-19T12:00:00+03:00",
	event_type: "order.created",
	result: "success",
	actor_id: null,
	source: "system",
	warehouse_id: null,
	order_id: null,
	changes: [],
	correlation_id: "operation-1",
} satisfies AuditPage["items"][number];

function readCachedAudit(pages: AuditPage[], pageParams: (string | null)[]) {
	const client = new QueryClient();
	client.setQueryData([...adminQueryKey("scope-1", "/audit"), ""], {
		pages,
		pageParams,
	});

	let result: ReturnType<typeof useAuditEvents> | undefined;

	function ReadAudit() {
		result = useAuditEvents({ request: unexpectedRequest }, "/audit");

		return null;
	}

	try {
		renderToString(
			createElement(QueryClientProvider, {
				client,
				children: createElement(WarehouseDataProvider, {
					value: warehouseData,
					children: createElement(ReadAudit),
				}),
			}),
		);

		if (!result) throw new Error("Audit hook did not render");

		return result;
	} finally {
		client.clear();
	}
}

test("the server cursor controls pagination even when the total changes", () => {
	const result = readCachedAudit(
		[
			{ items: [event], total: 2, next_cursor: "next-page" },
			{ items: [event], total: 4, next_cursor: "third-page" },
		],
		[null, "next-page"],
	);

	expect(result.events).toEqual([event]);
	expect(result.total).toBe(4);
	expect(result.query.hasNextPage).toBe(true);
});

test("a null cursor finishes pagination without comparing counts", () => {
	const result = readCachedAudit(
		[{ items: [], total: 1, next_cursor: null }],
		[null],
	);

	expect(result.isComplete).toBe(true);
	expect(result.query.hasNextPage).toBe(false);
});

test("a repeated cursor cannot trigger repeated reads", () => {
	const pages = [
		{ items: [event], total: 5, next_cursor: "second-page" },
		{ items: [], total: 5, next_cursor: "second-page" },
	];
	const result = readCachedAudit(pages, [null, "second-page"]);

	expect(result.query.hasNextPage).toBe(false);
});

test("reading a page passes server filters and preserves an opaque cursor", async () => {
	const page = { items: [event], total: 1, next_cursor: null };
	const http = {
		request: async (path: string) => {
			const url = new URL(path, "https://gridly.test");
			expect(url.searchParams.get("cursor")).toBe("opaque=+/");
			expect(url.searchParams.get("q")).toBe("событие");
			expect(url.searchParams.has("offset")).toBe(false);

			return page;
		},
	};
	const filters = new URLSearchParams({ q: "событие" }).toString();

	expect(await readAuditPage(http, "/audit", filters, "opaque=+/")).toEqual(
		page,
	);
});
