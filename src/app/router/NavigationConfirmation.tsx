import { type ReactNode, useCallback, useRef } from "react";
import { useBlocker } from "react-router-dom";
import {
	NavigationConfirmationContext,
	type NavigationGuard,
	type NavigationPrompt,
} from "@/ports/navigation";
import { ConfirmDialog } from "@/shared/ui/overlays";

export function NavigationConfirmation({ children }: { children: ReactNode }) {
	const guards = useRef(new Set<NavigationGuard>());
	const prompt = useRef<NavigationPrompt | undefined>(undefined);
	const register = useCallback((guard: NavigationGuard) => {
		guards.current.add(guard);

		return () => {
			guards.current.delete(guard);
		};
	}, []);
	const navigation = useBlocker(({ currentLocation, nextLocation }) => {
		for (const guard of guards.current) {
			const next = guard(currentLocation.pathname, nextLocation.pathname);
			if (!next) continue;

			prompt.current = next;
			return true;
		}

		return false;
	});
	const blocked = navigation.state === "blocked" ? prompt.current : undefined;

	return (
		<NavigationConfirmationContext.Provider value={register}>
			{children}
			{blocked && navigation.state === "blocked" && (
				<ConfirmDialog
					open
					title={blocked.title}
					description={blocked.description}
					icon={blocked.icon}
					cancelLabel={blocked.cancelLabel}
					confirmLabel={blocked.confirmLabel}
					onCancel={navigation.reset}
					onConfirm={() => {
						navigation.proceed();
						blocked.onConfirm?.();
					}}
				/>
			)}
		</NavigationConfirmationContext.Provider>
	);
}
