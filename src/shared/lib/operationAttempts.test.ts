import { expect, test } from "bun:test";

import { memoryStorage } from "../browser/browserStorage";
import {
	clearOperationAttempts,
	operationAttemptKey,
} from "./operationAttempts";

test("attempt keys keep the stored format of guest links and shipments", () => {
	expect(operationAttemptKey("guest-link", ["sandbox", "a-1", "/path"])).toBe(
		'gridly.guest-link-attempt:["sandbox","a-1","/path"]',
	);
	expect(operationAttemptKey("shipment", ["s-1", "w-1", "o-1"])).toBe(
		'gridly.shipment-attempt:["s-1","w-1","o-1"]',
	);
});

test("clearing a session scope removes only that scope's attempts", () => {
	const storage = memoryStorage();
	const kept = [
		operationAttemptKey("guest-link", ["sandbox", "a-10", "/path"]),
		operationAttemptKey("shipment", ["standard", "a-1", "w-1"]),
		'gridly.forms:["sandbox","a-1"]:draft',
	];
	const removed = [
		operationAttemptKey("guest-link", ["sandbox", "a-1", "/path"]),
		operationAttemptKey("shipment", ["sandbox", "a-1", "w-1", "o-1"]),
	];

	for (const key of [...kept, ...removed]) storage.setItem(key, "{}");

	clearOperationAttempts(storage, ["sandbox", "a-1"]);

	expect(kept.map((key) => storage.getItem(key))).toEqual(["{}", "{}", "{}"]);
	expect(removed.map((key) => storage.getItem(key))).toEqual([null, null]);
});
