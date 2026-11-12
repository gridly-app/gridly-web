import { useMediaQuery } from "./use-media-query";

export function usePrefersTheme(): "dark" | "light" {
	const isDark = useMediaQuery("(prefers-color-scheme: dark)", false);
	return isDark ? "dark" : "light";
}
