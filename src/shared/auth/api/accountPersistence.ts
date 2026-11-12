import { z } from "zod";
import type { KeyValueStorage } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib";

const accountKey = "gridly.user";
const tabLogoutKey = "gridly.account.logged-out";
const accountTransition = "null";
const accountSchema = z.object({ login: z.string().min(1), id: z.uuid() });
export type Account = z.infer<typeof accountSchema>;

type AccountLock = <T>(
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

export class AccountPersistence {
	constructor(
		private readonly storage: KeyValueStorage,
		private readonly tabStorage?: KeyValueStorage,
	) {}

	restore(): Account | null {
		try {
			const stored = this.storage.getItem(accountKey);
			if (!stored) return null;
			const account = accountSchema.safeParse(JSON.parse(stored));
			if (!account.success) return null;
			return this.tabStorage?.getItem(tabLogoutKey) === account.data.id
				? null
				: account.data;
		} catch {
			runtimeNotices.report(
				"account.read",
				"Не удалось восстановить сохранённый вход. Войдите в аккаунт снова.",
			);
			return null;
		}
	}

	endInTab(account: Account) {
		try {
			this.tabStorage?.setItem(tabLogoutKey, account.id);
		} catch {
			runtimeNotices.report(
				"account.tab-logout",
				"Не удалось сохранить выход для этой вкладки. Дождитесь завершения выхода перед перезагрузкой.",
			);
		}
	}

	isChange(event: StorageEvent) {
		return (
			(event.key === accountKey || event.key === null) &&
			event.newValue !== accountTransition
		);
	}

	matches(account: Account) {
		return this.read() === JSON.stringify(account);
	}

	read() {
		try {
			return this.storage.getItem(accountKey);
		} catch {
			return null;
		}
	}

	beginLogin() {
		return this.write(accountTransition);
	}

	remember(login: string): Account | null {
		const account = { login, id: crypto.randomUUID() };
		return this.write(JSON.stringify(account)) ? account : null;
	}

	write(value: string) {
		try {
			this.storage.setItem(accountKey, value);
			return true;
		} catch {
			runtimeNotices.report(
				"account.write",
				"Не удалось сохранить вход в браузере. После перезагрузки войдите снова.",
			);
			return false;
		}
	}

	clear() {
		try {
			this.storage.removeItem(accountKey);
		} catch {
			runtimeNotices.report(
				"account.remove",
				"Не удалось обновить сохранённый вход. Проверьте доступ к хранилищу браузера.",
			);
		}
	}
}
