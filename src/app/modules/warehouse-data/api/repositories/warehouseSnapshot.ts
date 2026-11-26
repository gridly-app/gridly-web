import type { Warehouse, WarehouseLayout } from "@/domain/warehouse";
import { ApiError, type HttpClient, parseResponse } from "@/shared/http";
import { type LayoutDto, layoutDto } from "../layout/layout.dto";
import { cellsFromDto } from "./restMappers";

export async function readPublishedLayout(
	http: HttpClient,
	base: string,
	warehouse: Warehouse,
	cached: LayoutDto | undefined,
	signal: AbortSignal,
) {
	if (!warehouse.published) return undefined;
	if (
		cached?.version === warehouse.version &&
		cached.width === warehouse.width &&
		cached.height === warehouse.height
	)
		return cached;

	return parseResponse(
		layoutDto,
		await http.request(`${base}/layout`, { signal }),
	);
}

export async function readDraftLayout(
	http: HttpClient,
	base: string,
	signal: AbortSignal,
) {
	try {
		return parseResponse(
			layoutDto,
			await http.request(`${base}/layout/draft`, { signal }),
		);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return undefined;

		throw error;
	}
}

export function mapFromLayouts(
	{ width, height, version, published }: Warehouse,
	layout: LayoutDto | undefined,
	draft: LayoutDto | undefined,
): WarehouseLayout {
	const cells: WarehouseLayout["cells"] = layout
		? cellsFromDto(layout)
		: Array.from({ length: width * height }, (_, index) => ({
				x: index % width,
				y: Math.floor(index / width),
				type: "empty",
			}));

	return {
		width,
		height,
		version,
		published,
		cells,
		routePlans: layout?.routes,
		draft: draft ? cellsFromDto(draft) : null,
		draftRoutes: draft?.routes,
		draftRevision: draft?.revision,
	};
}
