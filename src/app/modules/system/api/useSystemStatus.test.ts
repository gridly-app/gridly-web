import { expect, test } from "bun:test";
import {
	notifyManager,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { act, createElement } from "react";

import { WarehouseDataProvider } from "@/ports/warehouse";
import { FetchHttpClient } from "@/shared/http";
import { mountDom } from "../../../../../tests/support/dom";
import { RestWarehouseRepository } from "../../warehouse-data/api/repositories/restRepository";
import { WarehouseRepositoryProvider } from "../../warehouse-data/WarehouseRepositoryProvider";
import { warehouseData } from "../../warehouse-data/model/warehouseData";
import { useSystemStatus } from "./systemApi";

test("diagnostics waits for valid dates and keeps the response for the selected warehouse", async () => {
	const dom = mountDom();
	const client = new QueryClient();
	const cacheUpdates: string[] = [];
	const first = Promise.withResolvers<Response>();
	const firstStarted = Promise.withResolvers<void>();
	const requests: {
		params: URLSearchParams;
		signal: AbortSignal | null | undefined;
	}[] = [];
	const http = new FetchHttpClient("/api", async (input, options) => {
		const url = new URL(String(input), "http://localhost");

		requests.push({ params: url.searchParams, signal: options?.signal });

		if (url.searchParams.get("warehouse_id") === "west") {
			firstStarted.resolve();

			return first.promise;
		}

		return diagnostics("east");
	});
	const repository = new RestWarehouseRepository(http, client);
	let model: ReturnType<typeof useSystemStatus> | undefined;

	function Status({
		filters,
	}: {
		filters: Parameters<typeof useSystemStatus>[2];
	}) {
		model = useSystemStatus(http, "/admin/shipment-system", filters);
		const id = model.query.data?.order_diagnostics?.warehouse_id;

		if (id) cacheUpdates.push(id);

		return null;
	}

	function render(filters: Parameters<typeof useSystemStatus>[2]) {
		dom.root.render(
			createElement(QueryClientProvider, {
				client,
				children: createElement(WarehouseRepositoryProvider, {
					repository,
					children: createElement(WarehouseDataProvider, {
						value: warehouseData,
						children: createElement(Status, { filters }),
					}),
				}),
			}),
		);
	}

	const filters = {
		orderScope: { warehouseId: "west", orderId: "order" },
		from: "2026-11-12",
		to: "2026-11-12",
		timeZone: "Europe/Moscow",
	};

	try {
		await act(async () => render({ ...filters, timeZone: undefined }));
		expect(model?.rangeError).toContain("часового пояса");

		await act(async () => render({ ...filters, to: "2026-11-11" }));
		expect(model?.rangeError).toBe(
			"Дата окончания должна быть не раньше даты начала.",
		);
		expect(requests).toEqual([]);

		await act(async () => render(filters));
		await firstStarted.promise;

		expect(Object.fromEntries(requests[0]?.params ?? [])).toEqual({
			warehouse_id: "west",
			order_id: "order",
			from: "2026-11-11T21:00:00.000Z",
			to: "2026-11-12T21:00:00.000Z",
		});

		await act(async () =>
			render({
				...filters,
				orderScope: { warehouseId: "east", orderId: "order" },
			}),
		);
		await act(async () => {
			await model?.query.refetch();
			await new Promise<void>((resolve) => notifyManager.schedule(resolve));
		});
		await act(async () => first.resolve(diagnostics("west")));

		expect(requests[0]?.signal?.aborted).toBe(true);
		expect(
			requests.some(({ params }) => params.get("warehouse_id") === "east"),
		).toBe(true);
		expect(model?.query.data?.order_diagnostics?.warehouse_id).toBe("east");
		expect(cacheUpdates).not.toContain("west");
	} finally {
		first.resolve(diagnostics("west"));
		await dom.close();
		client.clear();
	}
});

function diagnostics(warehouseId: string) {
	return Response.json({
		checked_at: "2026-11-12T10:00:00Z",
		components: [],
		error_count: 0,
		recent_errors: [],
		jobs: [],
		order_diagnostics: {
			warehouse_id: warehouseId,
			order_id: "order",
			updated_at: null,
			recent_events: [],
		},
	});
}
