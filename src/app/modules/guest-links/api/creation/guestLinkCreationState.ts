import type { UserError } from "@/shared/lib";

import type { CreatedGuestLink } from "../guestLink.dto";
import type { StoredCreationAttempt } from "./guestLinkCreationStorage";

export type UnconfirmedCreation = StoredCreationAttempt & {
	status: "unknown";
	message?: string;
};

export type RejectedCreation = { status: "rejected"; error: unknown };

export type IssuedCreation = {
	status: "issued";
	link: Pick<CreatedGuestLink, "id" | "url">;
};

export type GuestLinkCreationState =
	| (StoredCreationAttempt & { status: "pending" })
	| UnconfirmedCreation
	| RejectedCreation
	| { status: "storage-error"; error: UserError }
	| IssuedCreation
	| null;
