import { type HttpClient, parseResponse } from "@/shared/http";
import { orderFromDto } from "../repositories/restMappers";
import { orderDto } from "./orderDto";

export async function readOrder(
	http: HttpClient,
	warehouseId: string,
	orderId: string,
	signal: AbortSignal | undefined,
) {
	const path = `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}`;

	return orderFromDto(
		parseResponse(orderDto, await http.request(path, { signal })),
	);
}
