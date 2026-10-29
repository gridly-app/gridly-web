import { expect, test } from "bun:test";
import {
	OrderFormDrafts,
	type SavedOrderForm,
} from "../src/pages/orders/model/orderFormDrafts";

function memory() {
	const data = new Map<string, string>();
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}

const form = (id: string): SavedOrderForm => ({
	id,
	version: 2,
	updatedAt: "2026-10-28T12:00:00Z",
	values: {
		party: "",
		lines: [{ key: "line", product: "", quantity: "", expires: "" }],
		manual: {
			confirmUnload: false,
			confirmPick: true,
			confirmPutaway: false,
			confirmLoad: false,
		},
	},
});

test("multiple incomplete forms survive repository recreation and deleting one keeps the other", () => {
	const storage = memory();
	const drafts = new OrderFormDrafts(storage, ["account", "a"], "w", "inbound");
	drafts.save(form("one"));
	drafts.save(form("two"));
	const reloaded = new OrderFormDrafts(
		storage,
		["account", "a"],
		"w",
		"inbound",
	);
	expect(reloaded.read()).toEqual([form("two"), form("one")]);
	reloaded.remove("one");
	expect(reloaded.read()).toEqual([form("two")]);
});

test("form scopes isolate accounts, warehouses, directions and demo sessions", () => {
	const storage = memory();
	new OrderFormDrafts(storage, ["account", "a"], "w", "inbound").save(
		form("one"),
	);
	for (const [scope, warehouse, kind] of [
		[["account", "b"], "w", "inbound"],
		[["account", "a"], "other", "inbound"],
		[["account", "a"], "w", "outbound"],
		[["demo", "a"], "w", "inbound"],
	] as const)
		expect(new OrderFormDrafts(storage, scope, warehouse, kind).read()).toEqual(
			[],
		);
	new OrderFormDrafts(storage, ["demo", "one"], "w", "inbound").save(
		form("demo"),
	);
	expect(
		new OrderFormDrafts(storage, ["demo", "two"], "w", "inbound").read(),
	).toEqual([]);
});

test("corrupt stored data is ignored and write failures are reported", () => {
	const storage = memory();
	const drafts = new OrderFormDrafts(storage, ["account", "a"], "w", "inbound");
	drafts.save(form("one"));
	const key = [...storage.data.keys()][0];
	storage.data.set(key, "broken");
	expect(drafts.read()).toEqual([]);
	storage.data.set(key, JSON.stringify([form("one"), { id: "invalid" }]));
	expect(drafts.read()).toEqual([form("one")]);
	storage.setItem = () => {
		throw new Error("Quota exceeded");
	};
	expect(() => drafts.save(form("two"))).toThrow("Quota exceeded");
	expect(drafts.read()).toEqual([form("one")]);
});

test("legacy array confirmations are read as a versioned named policy", () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
		removeItem: (key: string) => {
			values.delete(key);
		},
	};
	const key = 'gridly.forms:["account","operator"]:["w","inbound"]';
	storage.setItem(
		key,
		JSON.stringify([
			{
				id: "legacy",
				updatedAt: "2026-10-28T00:00:00.000Z",
				values: {
					party: "Keep",
					lines: [],
					manual: [true, false, true, false],
				},
			},
		]),
	);
	const drafts = new OrderFormDrafts(
		storage,
		["account", "operator"],
		"w",
		"inbound",
	);
	const restored = drafts.read()[0];
	expect(restored?.version).toBe(2);
	expect(restored?.values.manual).toEqual({
		confirmUnload: true,
		confirmPick: false,
		confirmPutaway: true,
		confirmLoad: false,
	});
	if (!restored) throw new Error("Expected restored form");
	drafts.save(restored);
	expect(JSON.parse(storage.getItem(key) ?? "[]")[0].version).toBe(2);
});

test("failed reads never allow saving or removing over existing forms", () => {
	const storage = memory();
	const drafts = new OrderFormDrafts(storage, ["account", "a"], "w", "inbound");
	drafts.save(form("existing"));
	const before = [...storage.data.entries()];
	storage.getItem = () => {
		throw new Error("Storage unavailable");
	};
	expect(() => drafts.read()).toThrow("Storage unavailable");
	expect(() => drafts.save(form("new"))).toThrow("Storage unavailable");
	expect(() => drafts.remove("existing")).toThrow("Storage unavailable");
	expect([...storage.data.entries()]).toEqual(before);
});
