import { ApiError, type HttpClient } from "@/shared/http";
import { errorMessage } from "@/shared/lib";

import type { CreatedGuestLink, GuestLinkInput } from "./guestLink.dto";
import type { createGuestLinkCreationAttempt } from "./guestLinkCreationAttempt";
import type { StoredCreationAttempt } from "./guestLinkCreationStorage";
import { createGuestLink } from "./guestLinksApi";
import type { createGuestLinksCache } from "./guestLinksCache";

type SubmissionKind = "new" | "retry";

const rejectedStatuses = new Set([400, 401, 403, 404, 412, 422]);

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

		const isRejected =
			error instanceof ApiError && rejectedStatuses.has(error.status);

		if (isRejected && kind === "new") {
			attempt.finish({ status: "rejected", error });

			return;
		}

		attempt.set({
			...submission,
			status: "unknown",
			hasRefreshedList: false,
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

		list.addIssued(link);
		attempt.finish({ status: "issued", link: { id: link.id, url: link.url } });
		void list.invalidate();

		return true;
	}

	async function start(input: GuestLinkInput) {
		attempt.restore();

		const state = attempt.read();

		if (state?.status === "pending" || state?.status === "unknown") {
			return false;
		}

		return submit({ key: crypto.randomUUID(), input }, "new");
	}

	async function retry() {
		const state = attempt.read();

		if (!canRetry || state?.status !== "unknown") return false;

		return submit({ key: state.key, input: state.input }, "retry");
	}

	return { start, retry };
}
