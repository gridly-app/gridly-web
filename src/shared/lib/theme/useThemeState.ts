import { useEffect, useState } from "react";
import { usePrefersTheme } from "../spaceui/use-prefers-theme";
import type { KeyValueStorage } from "../storage";
import type { ThemeState } from "./themeContext";

export function useThemeState(storage: KeyValueStorage): ThemeState {
	const preferred = usePrefersTheme();
	const [dark, setDark] = useState(() => {
		const saved = storage.getItem("gridly.theme");
		return saved ? saved === "dark" : preferred === "dark";
	});
	useEffect(() => {
		storage.setItem("gridly.theme", dark ? "dark" : "light");
	}, [dark, storage]);

	return { dark, setDark };
}
