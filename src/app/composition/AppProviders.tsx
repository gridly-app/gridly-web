import { QueryClientProvider } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useContext,
	useSyncExternalStore,
} from "react";
import { WarehouseRepositoryProvider } from "@/entities/warehouse";
import { DemoSessionProvider, SessionProvider } from "@/shared/auth";
import { ThemeProvider } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib/runtimeNotices";
import { Button, Feedback, WarmTooltipGroup } from "@/shared/ui";
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
				<Feedback key={message} tone="error">
					<div className={styles.notice}>
						<span>{message}</span>
						<Button
							type="button"
							onClick={() => runtimeNotices.dismiss(message)}
						>
							Закрыть
						</Button>
					</div>
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
								<WarmTooltipGroup>
									<RuntimeFeedback />
									{children}
								</WarmTooltipGroup>
							</ThemeProvider>
						</WarehouseRepositoryProvider>
					</DemoSessionProvider>
				</SessionProvider>
			</QueryClientProvider>
		</DependenciesContext.Provider>
	);
}
