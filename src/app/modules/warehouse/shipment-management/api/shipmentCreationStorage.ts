import { z } from "zod";

import type { KeyValueStorage } from "@/shared/lib";

const shipmentCreationSchema = z.object({
	kind: z.enum(["link", "document"]),
	status: z.enum(["sending", "unknown", "secret-expired", "mismatch"]),
	key: z.uuid(),
	linkId: z.string().min(1).optional(),
	startedAt: z.number().optional(),
	expiresAt: z.iso.datetime({ offset: true }).optional(),
});

export type ShipmentCreation = z.infer<typeof shipmentCreationSchema>;

export function readShipmentCreation(
	storage: KeyValueStorage,
	key: string | null,
): ShipmentCreation | null {
	if (!key) return null;

	const saved = storage.getItem(key);

	if (!saved) return null;

	const attempt = shipmentCreationSchema.parse(JSON.parse(saved));
	const status = attempt.status === "sending" ? "unknown" : attempt.status;

	return { ...attempt, status };
}

export function storeShipmentCreation(
	storage: KeyValueStorage,
	key: string | null,
	attempt: ShipmentCreation | null,
) {
	if (!key) return;

	if (!attempt) {
		storage.removeItem(key);

		return;
	}

	storage.setItem(key, JSON.stringify(attempt));
}
