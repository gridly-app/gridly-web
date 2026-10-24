import { useEffect, useState } from "react";
import type { KeyValueStorage } from "../storage";
import type { ThemeState } from "./themeContext";

export function useThemeState(storage: KeyValueStorage): ThemeState {
	const [dark, setDark] = useState(
		() => storage.getItem("gridly.theme") === "dark",
	);

	useEffect(() => {
		document.documentElement.dataset.theme = dark ? "dark" : "light";
		storage.setItem("gridly.theme", dark ? "dark" : "light");
	}, [dark, storage]);

	return { dark, setDark };
}
