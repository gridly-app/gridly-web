import { expect, test } from "bun:test";

import { shipment } from "../../../../../../tests/support/shipment";
import type { WorkingShipment } from "./shipment.dto";
import type { ShipmentCreation } from "./shipmentCreationStorage";
import { shipmentSharing } from "./shipmentSharing";

const expiredAttempt: ShipmentCreation = {
	kind: "link",
	status: "secret-expired",
	key: "8f6c2d4e-1b3a-4c5d-9e7f-0a1b2c3d4e5f",
	linkId: "link-1",
};

function revokeExpiredLink(shareLink: WorkingShipment["share_link"]) {
	const requests: string[] = [];
	let attempt: ShipmentCreation | null = expiredAttempt;
	const latest: WorkingShipment = {
		...shipment(),
		documents: [],
		share_link: shareLink,
		allowed_actions: [],
		revision: 1,
	};
	const sharing = shipmentSharing({
		http: {
			request: async (path, options) => {
				requests.push(`${options?.method} ${path}`);

				return {};
			},
		},
		path: "/test/shipment",
		creation: {
			getAttempt: () => attempt,
			create: async () => {
				throw new Error("Not used");
			},
			clear: () => {
				attempt = null;
			},
		},
		rereadShipment: async () => latest,
		applyConfirmedUpdate: async () => {},
	});
	const result = sharing.revokeLink(new AbortController().signal);

	return { result, requests, getAttempt: () => attempt };
}

const expiresAt = "2026-12-01T10:00:00Z";

test("revokes the expired attempt's link when the server omits share_link.id", async () => {
	const revoke = revokeExpiredLink({ expires_at: expiresAt });

	await revoke.result;

	expect(revoke.requests).toEqual(["DELETE /test/shipment/share-link"]);
	expect(revoke.getAttempt()).toBeNull();
});

test("refuses to revoke when the current link belongs to another attempt", async () => {
	const revoke = revokeExpiredLink({ id: "link-2", expires_at: expiresAt });

	await expect(revoke.result).rejects.toThrow(
		"Ссылка этой попытки больше не является текущей. Обновите данные.",
	);
	expect(revoke.requests).toEqual([]);
	expect(revoke.getAttempt()).toBeNull();
});

test("refuses to revoke when the shipment no longer has a link", async () => {
	const revoke = revokeExpiredLink(null);

	await expect(revoke.result).rejects.toThrow(
		"Ссылка этой попытки больше не является текущей. Обновите данные.",
	);
	expect(revoke.requests).toEqual([]);
	expect(revoke.getAttempt()).toBeNull();
});

test("revokes the link whose id matches the expired attempt", async () => {
	const revoke = revokeExpiredLink({ id: "link-1", expires_at: expiresAt });

	await revoke.result;

	expect(revoke.requests).toEqual(["DELETE /test/shipment/share-link"]);
	expect(revoke.getAttempt()).toBeNull();
});
