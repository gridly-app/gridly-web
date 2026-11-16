import {
	createContext,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useSyncExternalStore,
} from "react";
import { SessionProvider } from "@/app/session";
import { SandboxAccessProvider } from "@/ports/session";
import { WarehouseUiProvider } from "@/ports/warehouse";
import { runtimeNotices, ThemeProvider, useTheme } from "@/shared/lib";
import { FloatingAlerts, ToastProvider } from "@/shared/ui/feedback";
import { WarmTooltipGroup } from "@/shared/ui/overlays";
import { DeleteWarehouseDialog, StatusBadge } from "../warehouse-ui";
import type { AppDependencies } from "./dependencies.compose";

const WorkspaceRuntimes = createContext<{
	account: AppDependencies["account"]["warehouse"];
	sandbox: AppDependencies["sandbox"]["warehouse"];
} | null>(null);

export function useWarehouseRuntime(mode: "account" | "sandbox") {
	const runtimes = useContext(WorkspaceRuntimes);
	if (!runtimes) throw new Error("AppProviders is missing");

	return runtimes[mode];
}

function DocumentTheme() {
	const { dark } = useTheme();
	useLayoutEffect(() => {
		document.documentElement.dataset.theme = dark ? "dark" : "light";
	}, [dark]);
	return null;
}

function RuntimeFeedback() {
	const messages = useSyncExternalStore(
		runtimeNotices.subscribe,
		runtimeNotices.getSnapshot,
	);
	return (
		<FloatingAlerts
			items={messages.map((message) => ({
				id: message,
				tone: "error",
				title: message,
				onDismiss: () => runtimeNotices.dismiss(message),
			}))}
		/>
	);
}

const warehouseUi = { DeleteWarehouseDialog, StatusBadge };

export function AppProviders({
	children,
	dependencies: { account, sandbox, localStorage },
}: {
	children: ReactNode;
	dependencies: AppDependencies;
}) {
	return (
		<SessionProvider repository={account.session}>
			<SandboxAccessProvider value={sandbox.access}>
				<WorkspaceRuntimes.Provider
					value={{ account: account.warehouse, sandbox: sandbox.warehouse }}
				>
					<ThemeProvider storage={localStorage}>
						<DocumentTheme />
						<ToastProvider>
							<WarmTooltipGroup>
								<RuntimeFeedback />
								<WarehouseUiProvider value={warehouseUi}>
									{children}
								</WarehouseUiProvider>
							</WarmTooltipGroup>
						</ToastProvider>
					</ThemeProvider>
				</WorkspaceRuntimes.Provider>
			</SandboxAccessProvider>
		</SessionProvider>
	);
}
