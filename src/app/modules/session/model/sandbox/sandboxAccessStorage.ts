import { z } from "zod";

import { type KeyValueStorage, runtimeNotices } from "@/shared/lib";

import { sandboxAccessSchema } from "../../api/sandboxAccess";

const storageKey = "gridly.sandbox.access";

const legacyKeys = ["gridly.demo.session", "gridly.demo", "gridly.sandbox"];

const storedSchema = sandboxAccessSchema.extend({
	last_warehouse_id: z.string().optional(),
});

export type SandboxAccessData = z.infer<typeof storedSchema>;

export class SandboxAccessStorage {
	constructor(private readonly storage: KeyValueStorage) {}

	load(): SandboxAccessData | null {
		this.removeLegacy();

		try {
			const saved = this.storage.getItem(storageKey);

			return saved ? storedSchema.parse(JSON.parse(saved)) : null;
		} catch {
			this.remove();

			return null;
		}
	}

	save(session: SandboxAccessData) {
		this.storage.setItem(storageKey, JSON.stringify(session));
	}

	remove() {
		try {
			this.storage.removeItem(storageKey);
		} catch {
			runtimeNotices.report(
				"sandbox.remove",
				"Не удалось удалить сохранённый доступ к песочнице. Очистите данные сайта перед повторным входом в песочницу.",
			);
		}
	}

	private removeLegacy() {
		try {
			for (const key of legacyKeys) this.storage.removeItem(key);
		} catch {
			runtimeNotices.report(
				"sandbox.legacy",
				"Не удалось удалить старые данные доступа к песочнице. Очистите данные сайта в настройках браузера.",
			);
		}
	}
}
