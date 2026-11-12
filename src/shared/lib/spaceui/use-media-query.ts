"use client";

import * as React from "react";

function subscribe(callback: () => void, query: string): () => void {
	if (typeof window === "undefined") return () => {};
	const mql = window.matchMedia(query);
	mql.addEventListener("change", callback);
	return () => mql.removeEventListener("change", callback);
}

export function useMediaQuery(query: string, serverFallback = false): boolean {
	return React.useSyncExternalStore(
		React.useCallback((callback) => subscribe(callback, query), [query]),
		() =>
			typeof window !== "undefined"
				? window.matchMedia(query).matches
				: serverFallback,
		() => serverFallback,
	);
}
