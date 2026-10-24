import type { ReactNode } from "react";
import type { KeyValueStorage } from "../storage";
import { ThemeContext } from "./themeContext";
import { useThemeState } from "./useThemeState";

export interface ThemeProviderProps {
	storage: KeyValueStorage;
	children: ReactNode;
}

export function ThemeProvider({ storage, children }: ThemeProviderProps) {
	const theme = useThemeState(storage);

	return (
		<ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
	);
}
