import type { WarehouseResource } from "@/ports/warehouse";

import type { warehousePaths } from "./workspacePaths";

export type WarehouseSection = keyof typeof warehousePaths;

export interface WarehouseRouteHandle {
	warehouseSection: WarehouseSection;
	resources: WarehouseResource[];
}

export * from "./confirmation";
export * from "./workspacePaths";

export type WorkspaceAccess = "standard" | "sandbox";

export interface RouteDescription {
	id: string;
	path: string;
	access: "public" | readonly WorkspaceAccess[];
}

export interface WarehouseScreenRoute extends RouteDescription {
	id: WarehouseSection;
	access: readonly WorkspaceAccess[];
	resources: readonly WarehouseResource[];
}

export const warehouseAccess = ["standard", "sandbox"] as const;
export * from "./adminLocation";
