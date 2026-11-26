import { z } from "zod";
import type { KeyValueStorage } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib";
import { sandboxAccessSchema } from "../../api/sandboxAccess";

const storageKey = "gridly.sandbox.access";
const storedSchema = sandboxAccessSchema.extend({
	last_warehouse_id: z.string().optional(),
});

export type SandboxAccessData = z.infer<typeof storedSchema>;

export class SandboxAccessStorage {
	constructor(private readonly storage: KeyValueStorage) {}

	load(): SandboxAccessData | null {
		try {
			this.storage.removeItem("gridly.demo.session");
			this.storage.removeItem("gridly.demo");
			this.storage.removeItem("gridly.sandbox");
		} catch {
			runtimeNotices.report(
				"sandbox.legacy",
				"Не удалось удалить старые данные доступа к песочнице. Очистите данные сайта в настройках браузера.",
			);
		}
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
}
