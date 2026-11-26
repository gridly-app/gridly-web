import type { Warehouse } from "@/domain/warehouse";
import type { WarehouseResource } from "@/ports/warehouse";
import { ApiError, type HttpClient, parseResponse } from "@/shared/http";
import { categoryDto, productDto } from "../catalog/catalogDto";
import { eventDto } from "../history/historyDto";
import { stockDto } from "../inventory/inventoryDto";
import { type LayoutDto, layoutDto } from "../layout/layout.dto.ts";
import { readMapState } from "../live/readMapState";
import { orderDto } from "../orders/orderDto";
import { robotDto } from "../robots/robotDto";
import { readWarehouseCollection } from "./readWarehouseCollection";
import {
	categoryFromDto,
	cellsFromDto,
	eventFromDto,
	orderFromDto,
	productFromDto,
	robotFromDto,
	stockFromDto,
} from "./restMappers";

export async function readSnapshotParts(
	http: HttpClient,
	base: string,
	warehouse: Warehouse,
	resource: WarehouseResource,
	{
		skipLive,
		skipDraft,
		cachedLayout,
		signal,
	}: {
		skipLive: boolean;
		skipDraft: boolean;
		cachedLayout: LayoutDto | undefined;
		signal: AbortSignal;
	},
) {
	const needs = (name: WarehouseResource) =>
		resource === "all" || resource === name;
	const withMap = needs("map");
	const layoutPromise = readPublishedLayout();
	const draftPromise = readDraftLayout();

	async function readPublishedLayout() {
		if (!withMap || !warehouse.published) return null;
		if (cachedLayout) return cachedLayout;

		const data = await http.request(`${base}/layout`, { signal });

		return parseResponse(layoutDto, data);
	}

	async function readDraftLayout() {
		if (!withMap || skipDraft) return null;

		try {
			const data = await http.request(`${base}/layout/draft`, { signal });

			return parseResponse(layoutDto, data);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) return null;

			throw error;
		}
	}

	const [
		layout,
		draft,
		state,
		robots,
		categories,
		products,
		orders,
		stock,
		events,
	] = await Promise.all([
		layoutPromise,
		draftPromise,
		withMap && !skipLive
			? readMapState(http, `${base}/map/state`, { signal })
			: Promise.resolve(null),
		withMap || needs("robots")
			? readWarehouseCollection(http, `${base}/robots`, robotDto, signal)
			: Promise.resolve([]),
		needs("catalog")
			? readWarehouseCollection(
					http,
					`${base}/categories?include_archived=true`,
					categoryDto,
					signal,
				)
			: Promise.resolve([]),
		needs("catalog")
			? readWarehouseCollection(
					http,
					`${base}/products?include_archived=true`,
					productDto,
					signal,
				)
			: Promise.resolve([]),
		needs("orders")
			? readWarehouseCollection(http, `${base}/orders`, orderDto, signal)
			: Promise.resolve([]),
		needs("inventory")
			? readWarehouseCollection(
					http,
					`${base}/inventory?include_robots=true`,
					stockDto,
					signal,
				)
			: Promise.resolve([]),
		needs("history")
			? readWarehouseCollection(http, `${base}/events`, eventDto, signal)
			: Promise.resolve([]),
	]);

	return {
		layout,
		draft,
		state,
		robots,
		categories,
		products,
		orders,
		stock,
		events,
	};
}

export function assembleSnapshot(
	warehouse: Warehouse,
	parts: Awaited<ReturnType<typeof readSnapshotParts>>,
) {
	const {
		layout,
		draft,
		state,
		robots,
		categories,
		products,
		orders,
		stock,
		events,
	} = parts;
	if (!layout) {
		warehouse.cells = Array.from(
			{ length: warehouse.width * warehouse.height },
			(_, index) => ({
				x: index % warehouse.width,
				y: Math.floor(index / warehouse.width),
				type: "empty",
				capacity: undefined,
			}),
		);
	}
	if (layout) {
		warehouse.cells = cellsFromDto(layout);
		warehouse.routePlans = layout.routes;
	}
	if (draft) {
		warehouse.draft = cellsFromDto(draft);
		warehouse.draftRoutes = draft.routes;
		warehouse.draftRevision = draft.revision;
	}
	warehouse.stateVersion = String(
		state?.state_version ?? warehouse.stateVersion ?? "0",
	);
	warehouse.tick = String(state?.tick ?? warehouse.tick);
	warehouse.asOf = state?.as_of || warehouse.asOf;
	const live = new Map((state?.robots ?? []).map((r) => [r.id, r]));

	warehouse.robots = robots.map((robot) =>
		robotFromDto(robot, live.get(robot.id)),
	);
	warehouse.categories = categories.map(categoryFromDto);
	warehouse.products = products.map(productFromDto);
	warehouse.orders = orders.map(orderFromDto);
	warehouse.stock = stock.map(stockFromDto);
	warehouse.events = events.map(eventFromDto);
}
