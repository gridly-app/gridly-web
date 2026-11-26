import { z } from "zod";

import { availableStorage } from "@/shared/lib";

import { guestLinkInputSchema } from "../guestLink.dto";

const attemptSchema = z.object({
	key: z.uuid(),
	startedAt: z.number().optional(),
	resolution: z
		.discriminatedUnion("status", [
			z.object({
				status: z.literal("secret-expired"),
				linkId: z.string().min(1),
			}),
			z.object({ status: z.literal("mismatch") }),
		])
		.optional(),
	input: guestLinkInputSchema,
});

export type StoredCreationAttempt = z.infer<typeof attemptSchema>;

export class CreationAttemptStorage {
	constructor(private readonly storageKey: string | null) {}

	read(): StoredCreationAttempt | "damaged" | null {
		if (!this.storageKey) return null;

		const saved = this.storage.getItem(this.storageKey);

		if (!saved) return null;

		try {
			const attempt = attemptSchema.safeParse(JSON.parse(saved));

			if (attempt.success) return attempt.data;
		} catch (error) {
			if (!(error instanceof SyntaxError)) throw error;
		}

		return "damaged";
	}

	store(attempt: StoredCreationAttempt) {
		if (this.storageKey)
			this.storage.setItem(this.storageKey, JSON.stringify(attempt));
	}

	remove() {
		if (this.storageKey) this.storage.removeItem(this.storageKey);
	}

	private get storage() {
		return availableStorage("sessionStorage").storage;
	}
}
