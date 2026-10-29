import { runtimeNotices } from "./runtimeNotices";
import type { KeyValueStorage } from "./storage";

export function memoryStorage(): KeyValueStorage {
	const values = new Map<string, string>();
	return {
		keys: () => [...values.keys()],
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, value);
		},
		removeItem: (key) => {
			values.delete(key);
		},
	};
}

/** Preferences may degrade to memory; form drafts use browserStorage directly. */
export function resilientStorage(
	source: () => KeyValueStorage,
	onFallback: () => void,
) {
	const memory = memoryStorage();
	let persistent = true;
	function access<T>(operation: (storage: KeyValueStorage) => T): T {
		if (!persistent) return operation(memory);
		try {
			return operation(source());
		} catch {
			persistent = false;
			onFallback();
			return operation(memory);
		}
	}
	const storage: KeyValueStorage = {
		getItem(key) {
			return access((target) => {
				const value = target.getItem(key);
				if (value === null) memory.removeItem(key);
				else memory.setItem(key, value);
				return value;
			});
		},
		setItem(key, value) {
			access((target) => target.setItem(key, value));
			memory.setItem(key, value);
		},
		removeItem(key) {
			// Retry persistent removal even after fallback so saved credentials are not left silently.
			try {
				source().removeItem(key);
			} catch {
				if (persistent) {
					persistent = false;
					onFallback();
				}
				runtimeNotices.report(
					"storage.cleanup",
					"Не удалось удалить сохранённые данные браузера. Локальные изменения применены. Очистите данные сайта в настройках браузера перед повторным использованием.",
				);
			}
			memory.removeItem(key);
		},
		keys: () => access((target) => target.keys?.() ?? Object.keys(target)),
	};
	return {
		storage,
		get persistent() {
			return persistent;
		},
	};
}
const adapters = new Map<string, ReturnType<typeof resilientStorage>>();
export function availableStorage(kind: "localStorage" | "sessionStorage") {
	let adapter = adapters.get(kind);
	if (!adapter) {
		adapter = resilientStorage(
			() => browserStorage(kind),
			() => {
				runtimeNotices.report(
					`storage.${kind}`,
					"Хранилище браузера недоступно. Изменения работают в текущей вкладке, но могут потеряться после перезагрузки. Проверьте настройки браузера и свободное место.",
				);
			},
		);
		adapters.set(kind, adapter);
	}
	return adapter;
}
export function readPreference(key: string, fallback = ""): string {
	return availableStorage("localStorage").storage.getItem(key) ?? fallback;
}
export function writePreference(key: string, value: string): void {
	availableStorage("localStorage").storage.setItem(key, value);
}

// Delay access to the Storage getter so unavailable storage becomes a recoverable form error.
export function browserStorage(
	kind: "localStorage" | "sessionStorage",
): KeyValueStorage {
	return {
		getItem: (key) => window[kind].getItem(key),
		setItem: (key, value) => window[kind].setItem(key, value),
		removeItem: (key) => window[kind].removeItem(key),
		keys: () => Object.keys(window[kind]),
	};
}
