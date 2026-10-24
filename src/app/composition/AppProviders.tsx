import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import type { WarehouseRepository } from "@/entities/warehouse";
import { WarehouseRepositoryProvider } from "@/entities/warehouse";
import { SessionProvider, useSession } from "@/shared/auth";
import { environment } from "@/shared/config";
import { ThemeProvider } from "@/shared/lib";
import { WarmTooltipGroup } from "@/shared/ui";
import type { AppDependencies } from "./dependencies";

export interface AppProvidersProps {
	children: ReactNode;
	dependencies: AppDependencies;
}

export interface WarehouseDataProviderProps {
	children: ReactNode;
	realRepository: WarehouseRepository;
	mockRepository: WarehouseRepository;
	demoRepository: WarehouseRepository;
}

function WarehouseDataProvider({
	children,
	realRepository,
	mockRepository,
	demoRepository,
}: WarehouseDataProviderProps) {
	const { isDemo } = useSession();

	return (
		<WarehouseRepositoryProvider
			repository={
				environment.mockApi
					? mockRepository
					: isDemo
						? demoRepository
						: realRepository
			}
		>
			{children}
		</WarehouseRepositoryProvider>
	);
}

export function AppProviders({ children, dependencies }: AppProvidersProps) {
	return (
		<QueryClientProvider client={dependencies.client}>
			<SessionProvider
				repository={dependencies.sessionRepository}
				onLogout={dependencies.logout}
			>
				<WarehouseDataProvider
					realRepository={dependencies.realRepository}
					mockRepository={dependencies.mockRepository}
					demoRepository={dependencies.demoRepository}
				>
					<ThemeProvider storage={localStorage}>
						<WarmTooltipGroup>
							<BrowserRouter>{children}</BrowserRouter>
						</WarmTooltipGroup>
					</ThemeProvider>
				</WarehouseDataProvider>
			</SessionProvider>
		</QueryClientProvider>
	);
}
