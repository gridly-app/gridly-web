import { expect, test } from "bun:test";
import { memoryStorage } from "@/shared/lib";
import {
	readShipmentCreation,
	storeShipmentCreation,
} from "./shipmentCreationStorage";

test("reloading an unfinished creation keeps its key and does not store a secret URL", () => {
	const storage = memoryStorage();
	const attempt = {
		kind: "link",
		status: "sending",
		key: "ccff0d4a-54c4-451a-a858-f7a824089b52",
		expiresAt: "2026-12-01T00:00:00Z",
	} as const;

	storeShipmentCreation(storage, "account-one:order", attempt);

	expect(readShipmentCreation(storage, "account-one:order")).toEqual({
		...attempt,
		status: "unknown",
	});
	expect(readShipmentCreation(storage, "account-two:order")).toBeNull();
	expect(storage.getItem("account-one:order")).not.toContain("url");

	storeShipmentCreation(storage, "account-one:order", null);

	expect(readShipmentCreation(storage, "account-one:order")).toBeNull();
});

test("corrupted recovery data cannot silently permit another creation", () => {
	const storage = memoryStorage();

	storage.setItem("attempt", "broken");

	expect(() => readShipmentCreation(storage, "attempt")).toThrow();
});
