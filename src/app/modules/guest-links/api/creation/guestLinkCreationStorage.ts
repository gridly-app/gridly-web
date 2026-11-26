import { z } from "zod";

import {
	useSandboxAccess,
	useSession,
	useWorkspaceMode,
} from "@/ports/session";
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

export function useCreationStorageKey(path: string) {
	const mode = useWorkspaceMode();
	const session = useSession();
	const { access } = useSandboxAccess();
	const accountSessionId =
		session.status === "active" ? session.sessionId : null;
	const sessionId = mode === "sandbox" ? access?.access_id : accountSessionId;

	if (!sessionId) return null;

	return `gridly.guest-link-attempt:${JSON.stringify([mode, sessionId, path])}`;
}

export function readCreationAttempt(storageKey: string | null) {
	if (!storageKey) return null;

	const { storage } = availableStorage("sessionStorage");
	const saved = storage.getItem(storageKey);

	if (!saved) return null;

	try {
		const attempt = attemptSchema.safeParse(JSON.parse(saved));

		if (attempt.success) return attempt.data;
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
	}

	storage.removeItem(storageKey);

	return null;
}

export function storeCreationAttempt(
	storageKey: string | null,
	attempt: StoredCreationAttempt,
) {
	if (!storageKey) return;

	const { storage } = availableStorage("sessionStorage");

	storage.setItem(storageKey, JSON.stringify(attempt));
}

export function removeCreationAttempt(storageKey: string | null) {
	if (!storageKey) return;

	const { storage } = availableStorage("sessionStorage");

	storage.removeItem(storageKey);
}
