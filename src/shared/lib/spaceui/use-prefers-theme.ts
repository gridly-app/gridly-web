import { useMediaQuery } from "@/shared/lib/spaceui/use-media-query";

export function usePrefersTheme(): "dark" | "light" {
	const isDark = useMediaQuery("(prefers-color-scheme: dark)", false);
	return isDark ? "dark" : "light";
}

export function useIsDarkMode(): boolean {
	return useMediaQuery("(prefers-color-scheme: dark)", false);
}
