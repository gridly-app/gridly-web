import {
	guestLinkReplayOutcome,
	isRefusedCreation,
	isReplayAvailable,
} from "@/domain/shipment";
import type { HttpClient } from "@/shared/http";
import { errorMessage, UserError } from "@/shared/lib";

import type { CreatedGuestLink, GuestLinkInput } from "../guestLink.dto";
import type { createGuestLinkCreationAttempt } from "./guestLinkCreationAttempt";
import type { StoredCreationAttempt } from "./guestLinkCreationStorage";
import { createGuestLink } from "../guestLinkRequests";
import type { createGuestLinksCache } from "../guestLinksCache";

type SubmissionKind = "new" | "retry";

export function createGuestLinkCreationResource(
	http: HttpClient,
	path: string,
	attempt: ReturnType<typeof createGuestLinkCreationAttempt>,
	list: ReturnType<typeof createGuestLinksCache>,
	canRetry: boolean,
) {
	function recordFailure(
		submission: StoredCreationAttempt,
		error: unknown,
		kind: SubmissionKind,
	) {
		if (!attempt.isPending(submission.key)) return;

		const outcome = guestLinkReplayOutcome(error);
		const isUnresolvedReplay =
			outcome?.status === "secret-expired" || outcome?.status === "mismatch";

		if (isUnresolvedReplay) {
			attempt.resolve(submission, outcome);
			void list.invalidate();

			return;
		}

		if (outcome?.status === "revoked") {
			attempt.finish({
				status: "rejected",
				error: new UserError("Ссылка уже отозвана."),
			});
			void list.invalidate();

			return;
		}

		if (isRefusedCreation(error) && kind === "new") {
			attempt.finish({ status: "rejected", error });

			return;
		}

		attempt.set({
			...submission,
			status: "unknown",
			message: errorMessage(error),
		});
	}

	async function submit(
		submission: StoredCreationAttempt,
		kind: SubmissionKind,
	) {
		attempt.begin(submission);

		let link: CreatedGuestLink;

		try {
			link = await createGuestLink(
				http,
				path,
				submission.input,
				submission.key,
			);
		} catch (error) {
			recordFailure(submission, error, kind);

			return false;
		}

		if (!attempt.isPending(submission.key)) return false;

		await list.cancelRead();

		if (!attempt.isPending(submission.key)) return false;

		const { url, ...metadata } = link;

		list.addIssued(metadata);
		attempt.finish({ status: "issued", link: { id: link.id, url } });
		void list.invalidate();

		return true;
	}

	async function start(input: GuestLinkInput) {
		attempt.restore();

		const state = attempt.read();
		const isAttemptOpen =
			state?.status === "pending" ||
			state?.status === "unknown" ||
			state?.status === "storage-error";

		if (isAttemptOpen) return false;

		return submit(
			{ key: crypto.randomUUID(), input, startedAt: Date.now() },
			"new",
		);
	}

	async function retry() {
		const state = attempt.read();

		if (!canRetry || state?.status !== "unknown" || state.resolution)
			return false;

		if (!isReplayAvailable(state.startedAt)) {
			attempt.set({ ...state, message: "Срок безопасного повтора истёк." });

			return false;
		}

		return submit(
			{ key: state.key, input: state.input, startedAt: state.startedAt },
			"retry",
		);
	}

	return { start, retry };
}
