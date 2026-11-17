import { queryOptions, useQuery } from "@tanstack/react-query";

import { adminQueryKey } from "@/ports/administration";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";

import {
	createdGuestLinkSchema,
	type GuestLinkInput,
	guestLinksSchema,
} from "./guestLink.dto";

export function useGuestLinksQueryKey(path: string) {
	const scopeId = useWarehouseScopeId();

	return adminQueryKey(scopeId, path);
}

export function useGuestLinks(http: HttpClient, path: string) {
	const queryKey = useGuestLinksQueryKey(path);

	return useQuery(guestLinksQueryOptions(http, path, queryKey));
}

export function guestLinksQueryOptions(
	http: HttpClient,
	path: string,
	queryKey: ReturnType<typeof adminQueryKey>,
) {
	return queryOptions({
		queryKey,
		queryFn: async ({ signal }) => {
			const response = await http.request(path, { signal, privacy: true });

			return parseResponse(guestLinksSchema, response);
		},
		retry: false,
	});
}

export async function createGuestLink(
	http: HttpClient,
	path: string,
	input: GuestLinkInput,
	key: string,
) {
	const response = await http.request(path, {
		method: "POST",
		body: input,
		idempotencyKey: key,
		privacy: true,
	});

	return parseResponse(createdGuestLinkSchema, response);
}

export async function updateGuestLink(
	http: HttpClient,
	path: string,
	id: string,
	revision: number,
	input: GuestLinkInput,
) {
	const target = `${path}/${encodeURIComponent(id)}`;

	await http.request(target, {
		method: "PATCH",
		body: { ...input, revision },
	});
}

export async function revokeGuestLink(
	http: HttpClient,
	path: string,
	id: string,
) {
	const target = `${path}/${encodeURIComponent(id)}`;

	await http.request(target, { method: "DELETE" });
}
