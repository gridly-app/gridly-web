export type AccountLock = <T>(
	operation: () => Promise<T>,
	signal?: AbortSignal,
) => Promise<T>;

export const browserAccountLock: AccountLock | undefined =
	typeof navigator !== "undefined" && navigator.locks
		? async (operation, signal) =>
				navigator.locks.request(
					"gridly.account",
					signal ? { signal } : {},
					operation,
				)
		: undefined;
