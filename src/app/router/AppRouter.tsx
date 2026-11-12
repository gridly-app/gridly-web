import { lazy } from "react";
import {
	createBrowserRouter,
	Navigate,
	Outlet,
	RouterProvider,
} from "react-router-dom";
import { AccountRoute, AuthRoute, WorkspaceEntry } from "./AccountRoute";
import { DemoEntry, DemoRoute } from "./DemoRoute";
import { RouteBoundary, RouteFailure } from "./RouteBoundary";
import { warehouseChildren } from "./warehouseRoutes";

const WorkspaceShell = lazy(() =>
	import("../layout/workspace").then((module) => ({
		default: module.WorkspaceShell,
	})),
);

const LandingPage = lazy(() =>
	import("@/pages/landing").then((module) => ({ default: module.LandingPage })),
);

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
			{
				path: "/app",
				element: (
					<AccountRoute>
						<WorkspaceEntry />
					</AccountRoute>
				),
			},
			{
				path: "/warehouses/:warehouseId",
				element: (
					<AccountRoute>
						<WorkspaceShell />
					</AccountRoute>
				),
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

export function AppRouter() {
	return <RouterProvider router={router} />;
}
