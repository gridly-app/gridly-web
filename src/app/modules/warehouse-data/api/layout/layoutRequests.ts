import {
	blockRoutePlanSchema,
	type Cell,
	selectionSummarySchema,
} from "@/domain/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import { serializeLayoutCells } from "./layoutCells";

export async function proposeRoutes(
	http: HttpClient,
	warehouseId: string,
	cells: Cell[],
	zoneIds: Set<string>,
	signal: AbortSignal | undefined,
) {
	const response = await http.request(
		`/warehouses/${encodeURIComponent(warehouseId)}/layout/routes/propose`,
		{
			method: "POST",
			readOnly: true,
			body: { cells: serializeLayoutCells(cells, zoneIds) },
			signal,
		},
	);

	return parseResponse(blockRoutePlanSchema.array(), response);
}

export async function readSelectionSummary(
	http: HttpClient,
	warehouseId: string,
	keys: string[],
	signal: AbortSignal | undefined,
) {
	const response = await http.request(
		`/warehouses/${encodeURIComponent(warehouseId)}/map/selection-summary`,
		{ method: "POST", readOnly: true, body: { cell_keys: keys }, signal },
	);

	return parseResponse(selectionSummarySchema, response);
}
