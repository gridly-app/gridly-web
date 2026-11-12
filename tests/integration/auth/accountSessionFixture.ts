import { memoryStorage } from "@/shared/lib/browserStorage";

export function accountStorage(login: string) {
	const storage = memoryStorage();
	storage.setItem(
		"gridly.user",
		JSON.stringify({ login, id: crypto.randomUUID() }),
	);
	return storage;
}

export const immediateLock = async <T>(action: () => Promise<T>) => action();

export function queuedLock() {
	let pending: Promise<unknown> = Promise.resolve();
	return <T>(action: () => Promise<T>) => {
		const next = pending.then(action);
		pending = next.catch(() => undefined);
		return next;
	};
}
