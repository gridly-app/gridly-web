import {
	createContext,
	type ReactNode,
	useContext,
	useLayoutEffect,
} from "react";

export interface NavigationPrompt {
	title: string;
	description: string;
	icon?: ReactNode;
	cancelLabel: string;
	confirmLabel: string;
	onConfirm?: () => void;
}

export type NavigationGuard = (
	currentPath: string,
	nextPath: string,
) => NavigationPrompt | undefined;

export const NavigationConfirmationContext = createContext<
	((guard: NavigationGuard) => () => void) | null
>(null);

export function useNavigationConfirmation(guard: NavigationGuard) {
	const register = useContext(NavigationConfirmationContext);

	useLayoutEffect(() => register?.(guard), [guard, register]);
}
