import { z } from "zod";

const replayLifetimeMs = 24 * 60 * 60 * 1000;
const replayDetails = z.object({ link_id: z.string().min(1) });

export function isReplayAvailable(startedAt?: number) {
	return startedAt !== undefined && Date.now() - startedAt < replayLifetimeMs;
}

export function guestLinkReplayOutcome(error: unknown) {
	const response = z
		.object({
			status: z.number(),
			code: z.string(),
			details: z.unknown(),
		})
		.safeParse(error);

	if (!response.success) return;

	const { status, code, details } = response.data;
	const linkId = replayDetails.safeParse(details).data?.link_id;

	if (status === 409 && code === "RECEIPT_BODY_MISMATCH")
		return { status: "mismatch" } as const;
	if (status === 409 && code === "LINK_ALREADY_REVOKED")
		return { status: "revoked" } as const;
	if (status === 410 && code === "IDEMPOTENCY_SECRET_EXPIRED" && linkId) {
		return { status: "secret-expired", linkId } as const;
	}
}
