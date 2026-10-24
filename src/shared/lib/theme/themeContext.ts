import { createContext, useContext } from "react";

export interface ThemeState {
	dark: boolean;
	setDark: (dark: boolean) => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
	const theme = useContext(ThemeContext);

	if (!theme) {
		throw new Error("ThemeProvider is missing");
	}

	return theme;
}
