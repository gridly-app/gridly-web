import { z } from "zod";
import { type HttpClient, parseResponse } from "@/shared/api";
import { legacyMapStateDto, mapStateDto } from "../contracts/contract";

export async function readMapState(
	http: HttpClient,
	path: string,
	options: { signal?: AbortSignal },
) {
	const state = parseResponse(
		z.union([mapStateDto, legacyMapStateDto, z.undefined()]),
		await http.request(path, options),
	);

	if (!state || !("warehouse" in state)) {
		return state;
	}

	return {
		warehouse_id: state.warehouse.id,
		state_version: state.warehouse.state_version,
		tick: state.warehouse.tick,
		layout_version: state.warehouse.published_version || 0,
		as_of: state.warehouse.last_tick_at,
		robots: state.robots || [],
	};
}
