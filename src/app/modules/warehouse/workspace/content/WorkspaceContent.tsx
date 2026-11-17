import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouse, useWarehouses } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";
import { SidebarTrigger } from "@/shared/ui/navigation";
import { NewWarehouse } from "../creation/NewWarehouse";
import { RememberWarehouse } from "../lastWarehouse";
import type { useWarehouseRoute } from "../warehouseSection";
import styles from "./WorkspaceContent.module.css";
import { WorkspaceResources } from "./WorkspaceResources";

type WarehouseRoute = NonNullable<ReturnType<typeof useWarehouseRoute>>;

function WarehouseSectionContent({
	warehouseId,
	route,
}: {
	warehouseId: string;
	route: WarehouseRoute;
}) {
	const mode = useWorkspaceMode();
	const warehouses = useWarehouses();
	const snapshot = useWarehouse(warehouseId);
	const loading = (
		<Skeleton
			layout={route.warehouseSection === "map" ? "map" : "table"}
			label="Загружаем раздел…"
		/>
	);
	if (snapshot.isPending) return loading;

	const list = warehouses.data;
	const missingFromSandbox =
		mode === "sandbox" &&
		snapshot.isError &&
		!warehouses.isFetching &&
		list !== undefined &&
		!list.some(({ id }) => id === warehouseId);
	if (missingFromSandbox) {
		return <Navigate replace to={warehousePath(mode, list[0]?.id ?? "new")} />;
	}

	const error = snapshot.error ?? snapshot.failureReason;
	const accessLost =
		error instanceof ApiError && (error.status === 403 || error.status === 404);

	if (!snapshot.data || accessLost) {
		return (
			<Feedback
				inset
				tone="error"
				fill
				title={accessLost ? "Склад недоступен" : "Не удалось загрузить склад"}
				action={
					<RetryButton
						variant="secondary"
						size="sm"
						onRetry={snapshot.refetch}
					/>
				}
			>
				{errorMessage(error)}
			</Feedback>
		);
	}

	return (
		<>
			<RememberWarehouse warehouseId={warehouseId} />
			<WorkspaceResources
				warehouse={snapshot.data}
				isSnapshotStale={snapshot.isError}
				isSnapshotFetching={snapshot.isFetching}
				resources={route.resources}
				loadingFallback={loading}
			>
				<Suspense key={route.id} fallback={loading}>
					<Outlet />
				</Suspense>
			</WorkspaceResources>
		</>
	);
}

export function WorkspaceContent({
	warehouseId,
	route,
}: {
	warehouseId: string;
	route: WarehouseRoute | undefined;
}) {
	return (
		<main className={styles.workspaceMain}>
			<header className={styles.mobileHeader}>
				<SidebarTrigger aria-label="Открыть меню" />
				<span>Gridly</span>
			</header>
			<div className={styles.content} data-page={route?.warehouseSection}>
				<WorkspaceOutlet warehouseId={warehouseId} route={route} />
			</div>
		</main>
	);
}

function WorkspaceOutlet({
	warehouseId,
	route,
}: {
	warehouseId: string;
	route: WarehouseRoute | undefined;
}) {
	if (!route) return <Outlet />;
	if (warehouseId === "new") return <NewWarehouse />;
	return (
		<WarehouseSectionContent
			key={warehouseId}
			warehouseId={warehouseId}
			route={route}
		/>
	);
}
