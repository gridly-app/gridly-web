import { useQueryClient } from "@tanstack/react-query";
import { lazy, type ReactNode, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { AuditEvent } from "@/domain/shipment";
import type { Warehouse } from "@/domain/warehouse";
import { adminApiPath, adminQueryKey } from "@/ports/administration";
import {
	adminLocation,
	type AdminSectionLocation,
	type OrderLocation,
} from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";

import { ApiError, type FetchHttpClient } from "@/shared/http";

import { administrationRoute } from "../modules/administration";
import {
	Audit,
	AuditEvents,
	describeAuditEvent,
	useAuditEvents,
} from "../modules/audit";
import { GuestLinks } from "../modules/guest-links";
import { Orders } from "../modules/orders";
import {
	RecentErrors,
	type RecentErrorsInput,
	System,
} from "../modules/system";
import { Users } from "../modules/users";
import { Warehouses, WarehouseSelection } from "../modules/warehouses";

import { useWorkspaceHttp } from "./workspace-providers.compose";

const Administration = lazy(administrationRoute.load);

export function AdministrationScreen({
	renderSettings,
	renderOrder,
}: {
	renderSettings: (warehouse: Warehouse) => ReactNode;
	renderOrder: (warehouse: Warehouse) => ReactNode;
}) {
	const http = useWorkspaceHttp();
	const mode = useWorkspaceMode();
	const auditPath = adminApiPath(mode, "audit");
	const systemPath = adminApiPath(mode, "system");

	function renderSection(section: AdminSectionLocation) {
		switch (section.tab) {
			case "warehouses":
				return <Warehouses renderSettings={renderSettings} />;
			case "orders":
				return (
					<AdminWarehouseSelection
						tab="orders"
						label="Заказы"
						warehouseId={section.warehouseId}
					>
						{(warehouse) => <Orders key={warehouse.id} warehouse={warehouse} />}
					</AdminWarehouseSelection>
				);
			case "users": {
				const { userId, userKind } = section;
				const key = JSON.stringify([userKind, userId]);

				return (
					<Users key={key} http={http} userId={userId} userKind={userKind} />
				);
			}
			case "audit":
				return <Audit http={http} path={auditPath} />;
			case "links":
				return (
					<AdminWarehouseSelection
						tab="links"
						label="Гостевые ссылки"
						warehouseId={section.warehouseId}
					>
						{(warehouse) => (
							<GuestLinks
								http={http}
								mode={mode}
								warehouse={warehouse}
								initialOrder={section.initialOrder}
							/>
						)}
					</AdminWarehouseSelection>
				);
			case "system": {
				const scopeKey = JSON.stringify(section.orderScope);

				return (
					<SystemWithAudit
						key={scopeKey}
						http={http}
						path={systemPath}
						auditPath={auditPath}
						orderScope={section.orderScope}
					/>
				);
			}
		}
	}

	return (
		<Administration
			mode={mode}
			renderSection={renderSection}
			renderOrder={renderOrder}
		/>
	);
}

function AdminWarehouseSelection({
	tab,
	label,
	warehouseId,
	children,
}: {
	tab: "orders" | "links";
	label: string;
	warehouseId: string | null;
	children: (warehouse: Warehouse) => ReactNode;
}) {
	const [, setParams] = useSearchParams();

	function handleWarehouseChange(id: string) {
		const destination = adminLocation(tab, { warehouse_id: id });

		setParams(destination);
	}

	return (
		<WarehouseSelection
			label={label}
			warehouseId={warehouseId}
			onWarehouseChange={handleWarehouseChange}
		>
			{children}
		</WarehouseSelection>
	);
}

function SystemWithAudit({
	http,
	path,
	auditPath,
	orderScope,
}: {
	http: FetchHttpClient;
	path: string;
	auditPath: string;
	orderScope: OrderLocation | null;
}) {
	const queryClient = useQueryClient();
	const scopeId = useWarehouseScopeId();

	function handleRefreshAudit() {
		void queryClient.invalidateQueries({
			queryKey: adminQueryKey(scopeId, auditPath),
			exact: true,
		});
	}

	function renderRecentErrors(input: RecentErrorsInput) {
		return (
			<RecentErrorsWithAudit {...input} http={http} auditPath={auditPath} />
		);
	}

	return (
		<System
			http={http}
			path={path}
			orderScope={orderScope}
			onRefreshAudit={handleRefreshAudit}
			renderAuditEvents={renderAuditEvents}
			renderRecentErrors={renderRecentErrors}
		/>
	);
}

function renderAuditEvents(
	items: AuditEvent[],
	search: string,
	label = "События заказа",
) {
	return <AuditEvents items={items} search={search} label={label} />;
}

function RecentErrorsWithAudit({
	http,
	auditPath,
	...input
}: RecentErrorsInput & {
	http: FetchHttpClient;
	auditPath: string;
}) {
	const [loadAll, setLoadAll] = useState(false);
	const { query, events, hasChanged } = useAuditEvents(http, auditPath, {
		enabled: input.items.length > 0,
		loadAll,
	});
	const isDenied =
		query.error instanceof ApiError && [401, 403].includes(query.error.status);
	const isComplete =
		query.isSuccess && !query.isFetching && !query.hasNextPage && !hasChanged;

	function handleLoadAll() {
		setLoadAll(true);
	}

	const audit = {
		events: isDenied ? undefined : events,
		error: query.error,
		isFetching: query.isFetching,
		isComplete,
		canLoadAll: query.hasNextPage && !loadAll && !isDenied,
		canSearchContext: !isDenied,
		onLoadAll: handleLoadAll,
		onRetry: query.refetch,
	};

	return (
		<RecentErrors
			{...input}
			audit={audit}
			describeEvent={describeAuditEvent}
			renderAuditEvents={renderAuditEvents}
		/>
	);
}
