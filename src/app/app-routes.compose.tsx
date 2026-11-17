import { lazy, type ReactNode, Suspense } from "react";
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	type RouteObject,
	RouterProvider,
	useMatches,
} from "react-router-dom";
import type { RouteDescription, WorkspaceAccess } from "@/ports/navigation";
import { Skeleton } from "@/shared/ui/feedback";
import { administrationRoute } from "./modules/administration";
import { useWorkspaceHttp } from "./composition/workspace-providers.compose";
import { landingRoute } from "./modules/landing";
import { AccountRoute, AuthRoute } from "./router/AccountRoute";
import { NavigationConfirmation } from "./router/NavigationConfirmation";
import { RouteFailure } from "./router/RouteFailure";
import { SandboxEntry, SandboxRoute } from "./router/SandboxRoute";
import { WorkspaceEntry } from "./router/WorkspaceEntry";
import { shipmentPortalRoute } from "./modules/shipment-portal";
import { ShipmentProgress } from "./modules/shipment-progress";
import { signInRoute } from "./modules/sign-in";
import {
	readLastWarehouse,
	WarehouseOrderCard,
	warehouseChildren,
	warehouseWorkspaceRoute,
} from "./modules/warehouse";
import { warehouseSettingsRoute } from "./modules/warehouse-settings";

const WorkspaceShell = lazy(warehouseWorkspaceRoute.load);
const LandingPage = lazy(landingRoute.load);
const ShipmentPortal = lazy(shipmentPortalRoute.load);
const ShipmentAdmin = lazy(() =>
	import("./composition/administration.compose").then(
		({ AdministrationScreen }) => ({
			default: AdministrationScreen,
		}),
	),
);
const SignInPage = lazy(signInRoute.load);
const WarehouseSettings = lazy(warehouseSettingsRoute.load);

function AdminRoute() {
	return (
		<ShipmentAdmin
			renderSettings={(warehouse) => (
				<WarehouseSettings warehouse={warehouse} />
			)}
			renderOrder={(warehouse) => <WarehouseOrderCard warehouse={warehouse} />}
		/>
	);
}

function RouteLayout() {
	const route = useMatches()[1];
	return (
		<NavigationConfirmation>
			<Suspense
				key={route?.id}
				fallback={route?.id === "landing" ? null : <Skeleton layout="page" />}
			>
				<Outlet />
			</Suspense>
		</NavigationConfirmation>
	);
}

function AccountEntry() {
	return <WorkspaceEntry preferredWarehouse={readLastWarehouse()} />;
}

function publicRoute(
	route: RouteDescription & { access: "public" },
	element: ReactNode,
): RouteObject {
	return { id: route.id, path: route.path, element };
}

function administrationRoutes(mode: WorkspaceAccess): RouteObject[] {
	const route: RouteDescription = administrationRoute;
	if (route.access === "public" || !route.access.includes(mode)) return [];

	const prefix = mode === "sandbox" ? "/sandbox" : "";

	return [{ path: prefix + route.path, element: <AdminRoute /> }];
}

function workspaceRoutes(mode: WorkspaceAccess): RouteObject[] {
	const route = warehouseWorkspaceRoute;
	if (!route.access.includes(mode)) return [];

	return [
		{
			path: mode === "standard" ? `/${route.path}` : route.path,
			element: <WorkspaceShell />,
			children: warehouseChildren({
				renderSettings: (warehouse) => (
					<WarehouseSettings warehouse={warehouse} workspace />
				),
				progress: ShipmentProgress,
				settingsRoute: warehouseSettingsRoute,
				useHttp: useWorkspaceHttp,
				mode,
			}),
		},
	];
}

const router = createBrowserRouter([
	{
		element: <RouteLayout />,
		errorElement: <RouteFailure />,
		children: [
			publicRoute(landingRoute, <LandingPage />),
			publicRoute(signInRoute, <AuthRoute signIn={<SignInPage />} />),
			publicRoute(
				shipmentPortalRoute,
				<ShipmentPortal progress={ShipmentProgress} />,
			),
			{
				element: <AccountRoute signIn={<SignInPage />} />,
				children: [
					...administrationRoutes("standard"),
					{ path: "/app", element: <AccountEntry /> },
					...workspaceRoutes("standard"),
				],
			},
			{
				path: "/sandbox",
				element: <SandboxRoute />,
				children: [
					{ index: true, element: <SandboxEntry /> },
					...administrationRoutes("sandbox"),
					...workspaceRoutes("sandbox"),
					{ path: "*", element: <Navigate replace to="/sandbox" /> },
				],
			},
			{ path: "*", element: <Navigate replace to="/" /> },
		],
	},
]);

export function AppRouter() {
	return <RouterProvider router={router} />;
}
