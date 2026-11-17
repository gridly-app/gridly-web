import type { QueryClient } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import type { HttpClient } from "@/shared/http";

import { createGuestLinkCreationAttempt } from "./guestLinkCreationAttempt";
import { createGuestLinkCreationRecovery } from "./guestLinkCreationRecovery";
import { createGuestLinkCreationResource } from "./guestLinkCreationResource";
import { createGuestLinksCache } from "./guestLinksCache";

export function createGuestLinkCreation(
	client: QueryClient,
	http: HttpClient,
	options: {
		scopeId: string;
		path: string;
		storageKey: string | null;
		canRetry: boolean;
	},
) {
	const { scopeId, path, storageKey, canRetry } = options;
	const listKey = adminQueryKey(scopeId, path);
	const list = createGuestLinksCache(client, http, path, listKey);
	const store = createGuestLinkCreationAttempt(client, listKey, storageKey);

	return {
		store,
		creation: createGuestLinkCreationResource(
			http,
			path,
			store,
			list,
			canRetry,
		),
		recovery: createGuestLinkCreationRecovery(store, list),
	};
}
