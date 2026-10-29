import type { KeyValueStorage } from "../storage";
export function formDraftPrefix(scope: readonly string[]) {
	return `gridly.forms:${JSON.stringify(scope)}:`;
}

export function clearFormDraftScope(
	storage: KeyValueStorage,
	scope: readonly string[],
) {
	const prefix = formDraftPrefix(scope);
	for (const key of storage.keys?.() ?? Object.keys(storage)) {
		if (key.startsWith(prefix)) storage.removeItem(key);
	}
}
