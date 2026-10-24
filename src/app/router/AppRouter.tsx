import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSession } from "@/shared/auth";

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

export function AppRouter() {
	const { user } = useSession();

	if (!user) {
		return (
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="*" element={<AuthPage />} />
			</Routes>
		);
	}

	return (
		<Routes>
			<Route path="/warehouses/:warehouseId" element={<WorkspaceShell />}>
				<Route path="map" element={<MapPage />} />
				<Route path="catalog" element={<CatalogPage />} />
				<Route path="robots" element={<RobotsPage />} />
				<Route
					path="inbound"
					element={<OrdersPage key="inbound" kind="inbound" />}
				/>
				<Route
					path="outbound"
					element={<OrdersPage key="outbound" kind="outbound" />}
				/>
				<Route path="inventory" element={<InventoryPage />} />
				<Route path="history" element={<HistoryPage />} />
				<Route path="settings" element={<SettingsPage />} />
				<Route path="information" element={<InformationPage />} />
				<Route path="warehouses" element={<InformationPage />} />
				<Route index element={<Navigate replace to="map" />} />
				<Route path="*" element={<Navigate replace to="../map" />} />
			</Route>
			<Route path="*" element={<LandingPage />} />
		</Routes>
	);
}
