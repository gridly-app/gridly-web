import type { QueryClient } from "@tanstack/react-query";

import type { adminQueryKey } from "@/ports/administration";
import { UserError } from "@/shared/lib";

import type {
	GuestLinkCreationState,
	IssuedCreation,
	RejectedCreation,
} from "./guestLinkCreationState";
import {
	CreationAttemptStorage,
	type StoredCreationAttempt,
} from "./guestLinkCreationStorage";

const damagedAttemptMessage =
	"Не удалось восстановить незавершённый выпуск. " +
	"Проверьте список ссылок и восстановите запись об операции перед новым выпуском.";

export function createGuestLinkCreationAttempt(
	client: QueryClient,
	listKey: ReturnType<typeof adminQueryKey>,
	storageKey: string | null,
) {
	const stateKey = [...listKey, "creation-attempt"];
	const storage = new CreationAttemptStorage(storageKey);

	function read() {
		return client.getQueryData<GuestLinkCreationState>(stateKey);
	}

	function set(state: GuestLinkCreationState) {
		client.setQueryData(stateKey, state);
	}

	function restore() {
		if (read()) return;

		const saved = storage.read();

		if (saved === "damaged") {
			set({
				status: "storage-error",
				error: new UserError(damagedAttemptMessage),
			});

			return;
		}

		if (saved) set({ ...saved, status: "unknown" });
	}

	function begin(attempt: StoredCreationAttempt) {
		storage.store(attempt);
		set({ ...attempt, status: "pending" });
	}

	function resolve(
		submission: StoredCreationAttempt,
		resolution: StoredCreationAttempt["resolution"],
	) {
		const retained = { ...submission, resolution };

		storage.store(retained);
		set({ ...retained, status: "unknown" });
	}

	function finish(state: RejectedCreation | IssuedCreation | null) {
		storage.remove();
		set(state);
	}

	function isPending(key: string) {
		const state = read();

		return state?.status === "pending" && state.key === key;
	}

	function forgetIssuedLink(id: string) {
		const state = read();
		const isIssuedLink = state?.status === "issued" && state.link.id === id;
		const isExpiredLink =
			state?.status === "unknown" &&
			state.resolution?.status === "secret-expired" &&
			state.resolution.linkId === id;

		if (isIssuedLink) set(null);

		if (isExpiredLink) finish(null);
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
		resolve,
		isPending,
		forgetIssuedLink,
		resetError,
	};
}
