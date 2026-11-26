import type { Warehouse } from "@/domain/warehouse";
import { useWarehouseResources } from "@/ports/warehouse";
import { ApiError, type HttpClient, isAccessDenied } from "@/shared/http";

import { useGuestLinks } from "../api/guestLinksQuery";

export function useWarehouseGuestLinkData(
	http: HttpClient,
	path: string,
	warehouse: Warehouse,
) {
	const query = useGuestLinks(http, path);
	const orderResource = useWarehouseResources(warehouse, ["orders"]);
	const orders = (orderResource.data?.orders ?? []).filter(
		({ kind }) => kind === "outbound",
	);
	const orderById = new Map(orders.map((order) => [order.id, order]));
	const errorStatus =
		query.error instanceof ApiError ? query.error.status : undefined;
	const isDenied = isAccessDenied(query.error);

	return {
		query,
		orderResource,
		orders,
		orderById,
		timezone: warehouse.timezone,
		links: query.isSuccess ? query.data.items : undefined,
		canOpenEditor:
			!isDenied && Boolean(query.data) && Boolean(orderResource.data),
		canWrite: query.isSuccess && !orderResource.error,
		isAccessDenied: isDenied,
		isListUnavailable: isDenied || errorStatus === 404,
	};
}

export type WarehouseGuestLinkData = ReturnType<
	typeof useWarehouseGuestLinkData
>;
