import {
	createContext,
	type ReactNode,
	useContext,
	useSyncExternalStore,
} from "react";
import type { ServerDemoSession } from "../ServerDemoSession";

const DemoContext = createContext<ServerDemoSession | null>(null);
export function DemoSessionProvider({
	session,
	children,
}: {
	session: ServerDemoSession;
	children: ReactNode;
}) {
	return (
		<DemoContext.Provider value={session}>{children}</DemoContext.Provider>
	);
}
export function useDemoSession() {
	const controller = useContext(DemoContext);
	if (!controller) throw new Error("DemoSessionProvider is missing");
	const snapshot = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
	);
	return { ...snapshot, controller };
}

export type WorkspaceMode = "standard" | "demo";
const WorkspaceModeContext = createContext<WorkspaceMode>("standard");
export const WorkspaceModeProvider = WorkspaceModeContext.Provider;
export function useWorkspaceMode() {
	return useContext(WorkspaceModeContext);
}
