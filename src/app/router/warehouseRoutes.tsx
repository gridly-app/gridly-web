import { lazy, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import type { WarehouseResource } from "@/entities/warehouse";
import type { WarehouseRouteHandle } from "../layout/workspace";

const CatalogPage = lazy(() =>
	import("@/pages/catalog").then((module) => ({ default: module.CatalogPage })),
);

const HistoryPage = lazy(() =>
	import("@/pages/history").then((module) => ({ default: module.HistoryPage })),
);

const InformationPage = lazy(() =>
	import("@/pages/information").then((module) => ({
		default: module.InformationPage,
	})),
);

const InventoryPage = lazy(() =>
	import("@/pages/inventory").then((module) => ({
		default: module.InventoryPage,
	})),
);

const MapPage = lazy(() =>
	import("@/pages/map").then((module) => ({ default: module.MapPage })),
);

const OrdersPage = lazy(() =>
	import("@/pages/orders").then((module) => ({ default: module.OrdersPage })),
);

const RobotsPage = lazy(() =>
	import("@/pages/robots").then((module) => ({ default: module.RobotsPage })),
);

const SettingsPage = lazy(() =>
	import("@/pages/settings").then((module) => ({
		default: module.SettingsPage,
	})),
);

function warehouseRoute(
	path: string,
	element: ReactNode,
	resources: WarehouseResource[] = [],
): RouteObject {
	return {
		path,
		element,
		handle: { resources } satisfies WarehouseRouteHandle,
	};
}

const orderResources: WarehouseResource[] = ["orders", "catalog", "robots"];
const reportResources: WarehouseResource[] = [
	"orders",
	"catalog",
	"inventory",
	"history",
];

export function warehouseChildren(): RouteObject[] {
	return [
		warehouseRoute("map", <MapPage />, ["map", "catalog"]),
		warehouseRoute("catalog", <CatalogPage />, ["catalog", "inventory"]),
		warehouseRoute("robots", <RobotsPage />, [
			"map",
			"robots",
			"orders",
			"catalog",
		]),
		warehouseRoute(
			"inbound",
			<OrdersPage key="inbound" kind="inbound" />,
			orderResources,
		),
		warehouseRoute(
			"outbound",
			<OrdersPage key="outbound" kind="outbound" />,
			orderResources,
		),
		warehouseRoute("inventory", <InventoryPage />, [
			"inventory",
			"catalog",
			"map",
			"orders",
			"robots",
			"history",
		]),
		warehouseRoute("history", <HistoryPage />, ["history"]),
		warehouseRoute("settings", <SettingsPage />),
		warehouseRoute("information", <InformationPage />, reportResources),
		warehouseRoute("warehouses", <InformationPage />, reportResources),
		{ index: true, element: <Navigate replace to="map" /> },
		{ path: "*", element: <Navigate replace to="../map" /> },
	];
}
