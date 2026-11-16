import { QueryClientProvider } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import {
	WarehouseRepositoryProvider,
	warehouseData,
} from "@/app/warehouse-data";
import { WorkspaceModeProvider } from "@/ports/session";
import { WarehouseDataProvider } from "@/ports/warehouse";
import type { AppDependencies } from "./dependencies.compose";

type WarehouseRuntime = AppDependencies["account"]["warehouse"];
const WorkspaceHttpContext = createContext<WarehouseRuntime["http"] | null>(
	null,
);

export function useWorkspaceHttp() {
	const http = useContext(WorkspaceHttpContext);
	if (!http) throw new Error("WorkspaceProviders is missing");
	return http;
}

export function WorkspaceProviders({
	mode,
	warehouse,
	children,
}: {
	mode: "standard" | "sandbox";
	warehouse: WarehouseRuntime;
	children: ReactNode;
}) {
	return (
		<WorkspaceModeProvider value={mode}>
			<WorkspaceHttpContext.Provider value={warehouse.http}>
				<QueryClientProvider client={warehouse.queryClient}>
					<WarehouseRepositoryProvider repository={warehouse.repository}>
						<WarehouseDataProvider value={warehouseData}>
							{children}
						</WarehouseDataProvider>
					</WarehouseRepositoryProvider>
				</QueryClientProvider>
			</WorkspaceHttpContext.Provider>
		</WorkspaceModeProvider>
	);
}
