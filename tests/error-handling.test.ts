import { expect, test } from "bun:test";
import {
	memoryStorage,
	resilientStorage,
} from "../src/shared/lib/browserStorage";
import { runtimeNotices } from "../src/shared/lib/runtimeNotices";

test("storage switches to memory once, retaining known values and new changes", () => {
	const source = memoryStorage();
	source.setItem("theme", "dark");
	let fail = false,
		warnings = 0;
	const adapter = resilientStorage(
		() => {
			if (fail) throw new DOMException("Denied", "SecurityError");
			return source;
		},
		() => {
			warnings++;
		},
	);
	expect(adapter.storage.getItem("theme")).toBe("dark");
	fail = true;
	adapter.storage.setItem("sidebar", "false");
	expect(adapter.persistent).toBe(false);
	expect(adapter.storage.getItem("theme")).toBe("dark");
	expect(adapter.storage.getItem("sidebar")).toBe("false");
	adapter.storage.removeItem("theme");
	expect(adapter.storage.getItem("theme")).toBeNull();
	expect(warnings).toBe(1);
});

test("quota failure retains the new preference in memory", () => {
	const source = memoryStorage();
	source.setItem = () => {
		throw new DOMException("Full", "QuotaExceededError");
	};
	const adapter = resilientStorage(
		() => source,
		() => {
			runtimeNotices.report("test.quota", "Storage unavailable");
		},
	);
	adapter.storage.setItem("theme", "dark");
	expect(adapter.storage.getItem("theme")).toBe("dark");
	expect(adapter.persistent).toBe(false);
});

test("repeated notices preserve a stable snapshot", () => {
	runtimeNotices.report("test.dedup", "Повторите действие");
	const snapshot = runtimeNotices.getSnapshot();
	runtimeNotices.report("test.dedup", "Повторите действие");
	expect(runtimeNotices.getSnapshot()).toBe(snapshot);
});

test("identical notices from local and session storage appear once and can be dismissed", () => {
	runtimeNotices.report("test.local", "Настройки не сохранены");
	runtimeNotices.report("test.session", "Настройки не сохранены");
	expect(
		runtimeNotices
			.getSnapshot()
			.filter((message) => message === "Настройки не сохранены"),
	).toHaveLength(1);
	runtimeNotices.dismiss("Настройки не сохранены");
	expect(runtimeNotices.getSnapshot()).not.toContain("Настройки не сохранены");
	runtimeNotices.report("test.local", "Настройки не сохранены");
	expect(runtimeNotices.getSnapshot()).not.toContain("Настройки не сохранены");
});
