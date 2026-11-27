import { z } from "zod";

import { type KeyValueStorage, runtimeNotices } from "@/shared/lib";

const accountKey = "gridly.user";

const tabLogoutKey = "gridly.account.logged-out";

const accountTransition = "null";

const accountSchema = z.object({ login: z.string().min(1), id: z.uuid() });

export type Account = z.infer<typeof accountSchema> & { isStored: boolean };

export type StoredAccountState = "same" | "other" | "unknown";

function serialize({ login, id }: Account) {
	return JSON.stringify({ login, id });
}

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

			const isLoggedOutInTab =
				this.tabStorage?.getItem(tabLogoutKey) === account.data.id;

			return isLoggedOutInTab ? null : { ...account.data, isStored: true };
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
		const isAccountKey = event.key === accountKey || event.key === null;

		return isAccountKey && event.newValue !== accountTransition;
	}

	matches(account: Account) {
		return this.compare(account) === "same";
	}

	compare(account: Account): StoredAccountState {
		let stored: string | null;

		try {
			stored = this.storage.getItem(accountKey);
		} catch {
			return "unknown";
		}

		if (stored === serialize(account)) return "same";
		if (!account.isStored && stored === null) return "unknown";

		return "other";
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

	remember(login: string): Account {
		const account = { login, id: crypto.randomUUID() };
		const isStored = this.write(JSON.stringify(account));

		return { ...account, isStored };
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
