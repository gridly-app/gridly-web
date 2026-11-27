import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { newWarehouseId, warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouse, useWarehouses } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";
import { SidebarTrigger } from "@/shared/ui/navigation";

import type { WarehouseRoute } from "../../model/useWarehouseRoute";
import { NewWarehouse } from "../NewWarehouse/NewWarehouse";
import { WorkspaceResources } from "../WorkspaceResources/WorkspaceResources";

import styles from "./WorkspaceContent.module.css";

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
	if (warehouseId === newWarehouseId) return <NewWarehouse />;

	return (
		<WarehouseSectionContent
			key={warehouseId}
			warehouseId={warehouseId}
			route={route}
		/>
	);
}

function isAccessLost(error: unknown) {
	return (
		error instanceof ApiError && (error.status === 403 || error.status === 404)
	);
}

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
	const skeletonLayout = route.warehouseSection === "map" ? "map" : "table";
	const loading = (
		<Skeleton layout={skeletonLayout} label="Загружаем раздел…" />
	);

	if (snapshot.isPending) return loading;

	const list = warehouses.data;
	const isListSettled = !warehouses.isFetching && list !== undefined;
	const isMissingFromSandbox =
		mode === "sandbox" &&
		snapshot.isError &&
		isListSettled &&
		!list.some(({ id }) => id === warehouseId);

	if (isMissingFromSandbox) {
		const fallbackId = list[0]?.id ?? newWarehouseId;

		return <Navigate replace to={warehousePath(mode, fallbackId)} />;
	}

	const error = snapshot.error ?? snapshot.failureReason;
	const accessLost = isAccessLost(error);

	if (!snapshot.data || accessLost) {
		const title = accessLost
			? "Склад недоступен"
			: "Не удалось загрузить склад";

		return (
			<Feedback
				inset
				tone="error"
				fill
				title={title}
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
	);
}
