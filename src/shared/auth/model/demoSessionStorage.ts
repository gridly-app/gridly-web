import { z } from "zod";
import type { KeyValueStorage } from "@/shared/lib";
import { runtimeNotices } from "@/shared/lib";
import { demoSessionSchema } from "../api/demoSession";

const storageKey = "gridly.demo.session";
const storedSchema = demoSessionSchema.extend({
	last_warehouse_id: z.string().optional(),
});

export type DemoCredentials = z.infer<typeof storedSchema>;

export class DemoSessionStorage {
	constructor(private readonly storage: KeyValueStorage) {}

	load(): DemoCredentials | null {
		try {
			this.storage.removeItem("gridly.demo");
		} catch {
			runtimeNotices.report(
				"demo.legacy",
				"Не удалось удалить устаревшие данные демо. Очистите данные сайта в настройках браузера.",
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

	save(session: DemoCredentials) {
		this.storage.setItem(storageKey, JSON.stringify(session));
	}

	remove() {
		try {
			this.storage.removeItem(storageKey);
		} catch {
			runtimeNotices.report(
				"demo.remove",
				"Не удалось удалить сохранённую демо-сессию. Очистите данные сайта перед повторным использованием демо.",
			);
		}
	}
}
