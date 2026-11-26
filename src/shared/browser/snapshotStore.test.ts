import { expect, test } from "bun:test";

import { createSnapshotStore } from "./snapshotStore";

test("subscribers see published snapshots until they unsubscribe", () => {
	const store = createSnapshotStore(1);
	const seen: number[] = [];
	const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()));

	store.publish(2);
	unsubscribe();
	store.publish(3);

	expect(seen).toEqual([2]);
	expect(store.getSnapshot()).toBe(3);
});

test("lifecycle hooks run for the first subscriber and after the last one leaves", () => {
	const events: string[] = [];
	const store = createSnapshotStore("idle", {
		onFirstSubscribe: () => events.push("first"),
		onLastUnsubscribe: () => events.push("last"),
	});
	const first = store.subscribe(() => undefined);
	const second = store.subscribe(() => undefined);

	first();
	second();

	expect(events).toEqual(["first", "last"]);
});
