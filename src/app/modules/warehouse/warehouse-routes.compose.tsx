import { lazy, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

import type { Warehouse } from "@/domain/warehouse";
import type {
	WarehouseRouteHandle,
	WarehouseScreenRoute,
	WorkspaceAccess,
} from "@/ports/navigation";
import type { ShipmentProgressSlot } from "@/ports/shipment";
import { useWarehouseScope } from "@/ports/warehouse";
import type { FileHttpClient } from "@/shared/http";
import { PageNotFound } from "@/shared/ui/feedback";

import { deliveriesRoute, shipmentRoute } from "./shipment-management";
import { catalogRoute } from "./warehouse-catalog";
import { historyRoute } from "./warehouse-history";
import { informationRoute } from "./warehouse-information";
import { inventoryRoute } from "./warehouse-inventory";
import { mapRoute } from "./warehouse-map";
import { loadOrderDialog, ordersRoute } from "./warehouse-orders";
import { robotsRoute } from "./warehouse-robots";

export const WarehouseOrderCard = lazy(loadOrderDialog);

const ShipmentManagementPage = lazy(shipmentRoute.load);
const DeliveriesPage = lazy(deliveriesRoute.load);
const CatalogPage = lazy(catalogRoute.load);
const HistoryPage = lazy(historyRoute.load);
const InformationPage = lazy(informationRoute.load);
const InventoryPage = lazy(inventoryRoute.load);
const MapPage = lazy(mapRoute.load);
const OrdersPage = lazy(ordersRoute.load);
const RobotsPage = lazy(robotsRoute.load);

function warehouseRoute(
	route: WarehouseScreenRoute,
	element: ReactNode,
	mode: WorkspaceAccess,
): RouteObject[] {
	if (!route.access.includes(mode)) return [];

	const handle: WarehouseRouteHandle = {
		warehouseSection: route.id,
		resources: [...route.resources],
	};

	return [{ path: route.path, element, handle }];
}

export function warehouseChildren({
	renderSettings,
	settingsRoute,
	progress,
	useHttp,
	mode,
}: {
	renderSettings: (warehouse: Warehouse) => ReactNode;
	settingsRoute: WarehouseScreenRoute;
	progress: ShipmentProgressSlot;
	useHttp: () => FileHttpClient;
	mode: WorkspaceAccess;
}): RouteObject[] {
	function DeliveriesRoute() {
		return <DeliveriesPage http={useHttp()} progress={progress} />;
	}

	function ShipmentManagementRoute() {
		return <ShipmentManagementPage http={useHttp()} />;
	}

	function SettingsRoute() {
		const { warehouse } = useWarehouseScope();

		return renderSettings(warehouse);
	}

	const warehouseListRoute = { ...informationRoute, path: "warehouses" };

	return [
		...warehouseRoute(mapRoute, <MapPage />, mode),
		...warehouseRoute(catalogRoute, <CatalogPage />, mode),
		...warehouseRoute(robotsRoute, <RobotsPage />, mode),
		...warehouseRoute(
			ordersRoute.inbound,
			<OrdersPage key="inbound" kind="inbound" />,
			mode,
		),
		...warehouseRoute(
			ordersRoute.outbound,
			<OrdersPage key="outbound" kind="outbound" />,
			mode,
		),
		...warehouseRoute(deliveriesRoute, <DeliveriesRoute />, mode),
		...warehouseRoute(shipmentRoute, <ShipmentManagementRoute />, mode),
		...warehouseRoute(inventoryRoute, <InventoryPage />, mode),
		...warehouseRoute(historyRoute, <HistoryPage />, mode),
		...warehouseRoute(settingsRoute, <SettingsRoute />, mode),
		...warehouseRoute(informationRoute, <InformationPage />, mode),
		...warehouseRoute(warehouseListRoute, <InformationPage />, mode),
		{ index: true, element: <Navigate replace to={mapRoute.path} /> },
		{ path: "*", element: <PageNotFound /> },
	];
}
