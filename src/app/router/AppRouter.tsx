import { lazy } from "react";
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	RouterProvider,
} from "react-router-dom";
import { useWarehouses } from "@/entities/warehouse";
import { useSession } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { useOnlineStatus } from "@/shared/lib";
import { readPreference } from "@/shared/lib/browserStorage";
import { Button, Feedback } from "@/shared/ui";
import { DemoEntry, DemoRoute } from "./DemoRoute";
import { RouteBoundary, RouteFailure } from "./RouteBoundary";

const WorkspaceShell = lazy(() =>
	import("@/app/layout/workspace/ui/WorkspaceShell").then((module) => ({
		default: module.WorkspaceShell,
	})),
);

const AuthPage = lazy(() =>
	import("@/pages/auth").then((module) => ({ default: module.AuthPage })),
);

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

const LandingPage = lazy(() =>
	import("@/pages/landing").then((module) => ({ default: module.LandingPage })),
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

function AuthRoute() {
	const online = useOnlineStatus();
	const { error } = useSession();
	if (!online)
		return (
			<Feedback role="status">
				Нет соединения. Для входа подключитесь к сети.{error && <p>{error}</p>}
			</Feedback>
		);
	return <AuthPage />;
}

function WorkspaceRoute() {
	const { user, status, error, restore } = useSession();
	if (status === "restoring")
		return <Feedback tone="loading">Восстанавливаем сессию…</Feedback>;
	if (status === "error")
		return (
			<Feedback
				tone="error"
				title="Не удалось восстановить сессию"
				action={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void restore();
						}}
					>
						Повторить
					</Button>
				}
			>
				{error}
			</Feedback>
		);

	return user ? <WorkspaceShell /> : <AuthRoute />;
}

const warehouseChildren = () => [
	{ path: "map", element: <MapPage /> },
	{ path: "catalog", element: <CatalogPage /> },
	{ path: "robots", element: <RobotsPage /> },
	{ path: "inbound", element: <OrdersPage key="inbound" kind="inbound" /> },
	{ path: "outbound", element: <OrdersPage key="outbound" kind="outbound" /> },
	{ path: "inventory", element: <InventoryPage /> },
	{ path: "history", element: <HistoryPage /> },
	{ path: "settings", element: <SettingsPage /> },
	{ path: "information", element: <InformationPage /> },
	{ path: "warehouses", element: <InformationPage /> },
	{ index: true, element: <Navigate replace to="map" /> },
	{ path: "*", element: <Navigate replace to="../map" /> },
];

const router = createBrowserRouter([
	{
		element: (
			<RouteBoundary>
				<Outlet />
			</RouteBoundary>
		),
		errorElement: <RouteFailure />,
		children: [
			{ path: "/", element: <LandingPage /> },
			{ path: "/auth", element: <AuthRoute /> },
			{ path: "/app", element: <AccountEntry /> },
			{
				path: "/warehouses/:warehouseId",
				element: <WorkspaceRoute />,
				children: warehouseChildren(),
			},
			{
				path: "/demo",
				element: <DemoRoute />,
				children: [
					{ index: true, element: <DemoEntry /> },
					{
						path: "warehouses/:warehouseId",
						element: <WorkspaceShell />,
						children: warehouseChildren(),
					},
					{ path: "*", element: <Navigate replace to="/demo" /> },
				],
			},
			{ path: "*", element: <Navigate replace to="/" /> },
		],
	},
]);

function WorkspaceEntry() {
	const query = useWarehouses();
	const last = readPreference("gridly.last");
	if (query.isPending)
		return <Feedback tone="loading">Загружаем склады…</Feedback>;
	if (query.error)
		return (
			<Feedback
				tone="error"
				title="Не удалось загрузить склады"
				action={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void query.refetch();
						}}
					>
						Повторить
					</Button>
				}
			>
				{query.error.message}
			</Feedback>
		);
	const id =
		query.data?.find((warehouse) => warehouse.id === last)?.id ??
		query.data?.[0]?.id ??
		"new";
	return <Navigate replace to={warehousePath("standard", id)} />;
}

function AccountEntry() {
	const { user, status, error, restore } = useSession();
	if (status === "restoring")
		return <Feedback tone="loading">Восстанавливаем сессию…</Feedback>;
	if (status === "error")
		return (
			<Feedback
				tone="error"
				title="Не удалось восстановить сессию"
				action={
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							void restore();
						}}
					>
						Повторить
					</Button>
				}
			>
				{error}
			</Feedback>
		);
	return user ? <WorkspaceEntry /> : <AuthRoute />;
}

export function AppRouter() {
	return <RouterProvider router={router} />;
}
