import { QueryClientProvider } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useSyncExternalStore,
} from "react";
import { WarehouseRepositoryProvider } from "@/entities/warehouse";
import { DemoSessionProvider, SessionProvider } from "@/shared/auth";
import { runtimeNotices, ThemeProvider } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, ToastProvider } from "@/shared/ui/feedback";
import { WarmTooltipGroup } from "@/shared/ui/overlays";
import type { AppDependencies } from "./dependencies";
import styles from "./RuntimeFeedback.module.css";

const DependenciesContext = createContext<AppDependencies | null>(null);

export function useAppDependencies() {
	const dependencies = useContext(DependenciesContext);
	if (!dependencies) throw new Error("AppProviders is missing");
	return dependencies;
}

function RuntimeFeedback() {
	const messages = useSyncExternalStore(
		runtimeNotices.subscribe,
		runtimeNotices.getSnapshot,
	);
	if (!messages.length) return null;
	return (
		<aside className={styles.notices} aria-label="Уведомления приложения">
			{messages.map((message) => (
				<Feedback
					key={message}
					tone="error"
					action={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => runtimeNotices.dismiss(message)}
						>
							Закрыть
						</Button>
					}
				>
					{message}
				</Feedback>
			))}
		</aside>
	);
}

export function AppProviders({
	children,
	dependencies,
}: {
	children: ReactNode;
	dependencies: AppDependencies;
}) {
	return (
		<DependenciesContext.Provider value={dependencies}>
			<QueryClientProvider client={dependencies.client}>
				<SessionProvider repository={dependencies.sessionRepository}>
					<DemoSessionProvider session={dependencies.demoSession}>
						<WarehouseRepositoryProvider
							repository={dependencies.realRepository}
						>
							<ThemeProvider storage={dependencies.localStorage}>
								<ToastProvider>
									<WarmTooltipGroup>
										<RuntimeFeedback />
										{children}
									</WarmTooltipGroup>
								</ToastProvider>
							</ThemeProvider>
						</WarehouseRepositoryProvider>
					</DemoSessionProvider>
				</SessionProvider>
			</QueryClientProvider>
		</DependenciesContext.Provider>
	);
}
