import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { useWarehouseScopeId } from "@/ports/warehouse";
import { environment } from "@/shared/config";
import type { HttpClient } from "@/shared/http";

import { createGuestLinkCreation } from "../api/guestLinkCreation";
import type { GuestLinkCreationState } from "../api/guestLinkCreationAttempt";
import { useCreationStorageKey } from "../api/guestLinkCreationStorage";
import { guestLinkCreationView } from "./guestLinkCreationView";

export function useGuestLinkCreation(http: HttpClient, path: string) {
	const client = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const storageKey = useCreationStorageKey(path);
	const canRetry = environment.adminGuestLinkReplay;
	const { store, creation, recovery } = useMemo(
		() =>
			createGuestLinkCreation(client, http, {
				scopeId,
				path,
				storageKey,
				canRetry,
			}),
		[client, http, scopeId, path, storageKey, canRetry],
	);
	const { data: state } = useQuery<GuestLinkCreationState>({
		queryKey: store.stateKey,
		queryFn: skipToken,
		initialData: null,
		gcTime: Infinity,
	});

	useEffect(store.restore, [store]);

	const view = guestLinkCreationView(state);

	return {
		...view,
		canRetry,
		startCreation: creation.start,
		retryCreation: creation.retry,
		refreshList: recovery.refreshList,
		acknowledgeCreation: recovery.acknowledge,
		forgetIssuedLink: store.forgetIssuedLink,
		resetError: store.resetError,
	};
}
