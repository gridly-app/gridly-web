import type { QueryClient } from "@tanstack/react-query";

import type { adminQueryKey } from "@/ports/administration";

import type { CreatedGuestLink } from "./guestLink.dto";
import {
	readCreationAttempt,
	removeCreationAttempt,
	type StoredCreationAttempt,
	storeCreationAttempt,
} from "./guestLinkCreationStorage";

type UnconfirmedCreation = StoredCreationAttempt & {
	status: "unknown";
	hasRefreshedList: boolean;
	message?: string;
};

type RejectedCreation = { status: "rejected"; error: unknown };
type IssuedCreation = {
	status: "issued";
	link: Pick<CreatedGuestLink, "id" | "url">;
};

export type GuestLinkCreationState =
	| (StoredCreationAttempt & { status: "pending" })
	| UnconfirmedCreation
	| RejectedCreation
	| IssuedCreation
	| null;

export function createGuestLinkCreationAttempt(
	client: QueryClient,
	listKey: ReturnType<typeof adminQueryKey>,
	storageKey: string | null,
) {
	const stateKey = [...listKey, "creation-attempt"];

	function read() {
		return client.getQueryData<GuestLinkCreationState>(stateKey);
	}

	function set(state: GuestLinkCreationState) {
		client.setQueryData(stateKey, state);
	}

	function restore() {
		if (read()) return;

		const saved = readCreationAttempt(storageKey);

		if (saved) set({ ...saved, status: "unknown", hasRefreshedList: false });
	}

	function begin(attempt: StoredCreationAttempt) {
		storeCreationAttempt(storageKey, attempt);
		set({ ...attempt, status: "pending" });
	}

	function finish(state: RejectedCreation | IssuedCreation | null) {
		removeCreationAttempt(storageKey);
		set(state);
	}

	function isPending(key: string) {
		const state = read();

		return state?.status === "pending" && state.key === key;
	}

	function forgetIssuedLink(id: string) {
		const state = read();

		if (state?.status === "issued" && state.link.id === id) set(null);
	}

	function resetError() {
		if (read()?.status === "rejected") set(null);
	}

	return {
		stateKey,
		read,
		set,
		restore,
		begin,
		finish,
		isPending,
		forgetIssuedLink,
		resetError,
	};
}
