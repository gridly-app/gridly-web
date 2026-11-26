import type { KeyValueStorage } from "../browser/storage";

const attemptKeyStart = /^gridly\.[a-z-]+-attempt:/;

export function operationAttemptKey(name: string, parts: readonly string[]) {
	return `gridly.${name}-attempt:${JSON.stringify(parts)}`;
}

export function clearOperationAttempts(
	storage: KeyValueStorage,
	scope: readonly string[],
) {
	const scopeStart = JSON.stringify(scope).slice(0, -1);

	for (const key of storage.keys?.() ?? Object.keys(storage)) {
		const start = attemptKeyStart.exec(key);

		if (!start) continue;

		const parts = key.slice(start[0].length);
		const isInScope =
			parts === `${scopeStart}]` || parts.startsWith(`${scopeStart},`);

		if (isInScope) storage.removeItem(key);
	}
}
