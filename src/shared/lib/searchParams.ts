import { useSearchParams } from "react-router-dom";

export type SearchParamChanges = Record<string, string | null>;

export function applySearchParamChanges(
	current: URLSearchParams,
	changes: SearchParamChanges,
) {
	const next = new URLSearchParams(current);

	for (const [key, value] of Object.entries(changes)) {
		if (value === null) next.delete(key);
		else next.set(key, value);
	}

	return next;
}

export function useUpdateSearchParams() {
	const [, setParams] = useSearchParams();

	return function updateSearchParams(changes: SearchParamChanges) {
		setParams((current) => applySearchParamChanges(current, changes), {
			replace: true,
		});
	};
}
