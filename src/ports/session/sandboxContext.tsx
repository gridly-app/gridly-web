import { createContext, useContext, useSyncExternalStore } from "react";
import type { SandboxController } from "./contracts";

const SandboxContext = createContext<SandboxController | null>(null);

export const SandboxAccessProvider = SandboxContext.Provider;

export function useSandboxAccess() {
	const controller = useContext(SandboxContext);
	if (!controller) throw new Error("SandboxAccessProvider is missing");
	const snapshot = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
	);
	return { ...snapshot, controller };
}

export type WorkspaceMode = "standard" | "sandbox";

const WorkspaceModeContext = createContext<WorkspaceMode>("standard");
export const WorkspaceModeProvider = WorkspaceModeContext.Provider;

export function useWorkspaceMode() {
	return useContext(WorkspaceModeContext);
}
