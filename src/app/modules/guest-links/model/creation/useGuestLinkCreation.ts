import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { isReplayAvailable } from "@/domain/shipment";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { environment } from "@/shared/config";
import type { HttpClient } from "@/shared/http";

import { createGuestLinkCreation } from "../../api/creation/guestLinkCreation";
import type { GuestLinkCreationState } from "../../api/creation/guestLinkCreationState";
import { guestLinkCreationView } from "./guestLinkCreationView";
import { useCreationStorageKey } from "./useCreationStorageKey";

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
		canRetry: canRetry && isReplayAvailable(view.attempt?.startedAt),
		startCreation: creation.start,
		retryCreation: creation.retry,
		refreshList: recovery.refreshList,
		forgetIssuedLink: store.forgetIssuedLink,
		resetError: store.resetError,
	};
}
