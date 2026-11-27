import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";

import { shipmentTrackingSchema } from "@/domain/shipment";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import { shipmentPath } from "./shipmentPath";

const trackingRefreshMs = 15_000;

export type DeliveryTracking = z.infer<typeof shipmentTrackingSchema>;

export function useDeliveryTracking(
	http: HttpClient,
	warehouseId: string,
	orderId: string | undefined,
) {
	const scopeId = useWarehouseScopeId();

	return useQuery({
		queryKey: [scopeId, "delivery", warehouseId, orderId],
		queryFn: async ({ signal }) => {
			const response = await http.request(
				shipmentPath(warehouseId, orderId ?? ""),
				{ signal },
			);

			return parseResponse(shipmentTrackingSchema, response);
		},
		enabled: Boolean(orderId),
		retry: false,
		refetchInterval: trackingRefreshMs,
	});
}
