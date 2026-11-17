import {
	skipToken,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";

import { useWarehouseScopeId } from "@/ports/warehouse";

import { ApiError, type FetchHttpClient, parseResponse } from "@/shared/http";
import { adminQueryKey } from "@/ports/administration";

import {
	createdGuestLinkSchema,
	type GuestLinkInput,
	type GuestLink,
	guestLinksSchema,
} from "./guestLink.dto";

type GuestLinkAction =
	| { type: "create"; input: GuestLinkInput; key: string }
	| { type: "update"; id: string; revision: number; input: GuestLinkInput }
	| { type: "revoke"; id: string };

async function writeGuestLink(
	http: FetchHttpClient,
	path: string,
	action: GuestLinkAction,
): Promise<GuestLinkResult> {
	if (action.type === "create") {
		const response = await http.request(path, {
			method: "POST",
			body: action.input,
			idempotencyKey: action.key,
			privacy: true,
		});
		const link = parseResponse(createdGuestLinkSchema, response);

		return { type: action.type, link };
	}

	const target = `${path}/${encodeURIComponent(action.id)}`;

	if (action.type === "revoke") {
		await http.request(target, { method: "DELETE" });

		return { type: action.type, id: action.id };
	}

	await http.request(target, {
		method: "PATCH",
		body: { ...action.input, revision: action.revision },
	});

	return { type: action.type };
}

type GuestLinkResult =
	| { type: "create"; link: z.infer<typeof createdGuestLinkSchema> }
	| { type: "revoke"; id: string }
	| { type: "update" };

type CreationAttempt = {
	key: string;
	input: GuestLinkInput;
	status: "pending" | "unknown";
};

type IssuedLink = { id: string; url: string };
type CreationState = CreationAttempt | { status: "issued"; link: IssuedLink };

const rejectedStatuses = new Set([400, 401, 403, 404, 412, 422]);

export function useGuestLinks(http: FetchHttpClient, path: string) {
	const scopeId = useWarehouseScopeId();

	return useQuery({
		queryKey: adminQueryKey(scopeId, path),
		queryFn: async ({ signal }) => {
			const response = await http.request(path, { signal, privacy: true });

			return parseResponse(guestLinksSchema, response);
		},
		retry: false,
	});
}

export function useGuestLinkMutation(
	http: FetchHttpClient,
	path: string,
	onSaved: (result: GuestLinkResult) => void,
) {
	const client = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const queryKey = adminQueryKey(scopeId, path);

	const attemptKey = [...queryKey, "creation-attempt"];
	const { data: creation } = useQuery<CreationState | null>({
		queryKey: attemptKey,
		queryFn: skipToken,
		initialData: null,
		gcTime: Infinity,
	});

	function readCreation() {
		return client.getQueryData<CreationState>(attemptKey);
	}

	function isCurrentAttempt(key: string) {
		const current = readCreation();

		return current && current.status !== "issued" && current.key === key;
	}

	const mutation = useMutation({
		mutationFn: (action: GuestLinkAction) => writeGuestLink(http, path, action),
		onError: (error, action) => {
			if (action.type !== "create" || !isCurrentAttempt(action.key)) return;

			const rejected =
				error instanceof ApiError && rejectedStatuses.has(error.status);
			const unknownAttempt: CreationAttempt = {
				key: action.key,
				input: action.input,
				status: "unknown",
			};

			client.setQueryData(attemptKey, rejected ? null : unknownAttempt);
		},
		onSuccess: async (result, action) => {
			if (result.type === "create" && action.type === "create") {
				if (!isCurrentAttempt(action.key)) return;

				await client.cancelQueries({ queryKey, exact: true });

				if (!isCurrentAttempt(action.key)) return;

				const { link } = result;

				client.setQueryData<{ items: GuestLink[] }>(queryKey, (current) => {
					const otherLinks =
						current?.items.filter((item) => item.id !== link.id) ?? [];

					return { items: [link, ...otherLinks] };
				});
				const issued: CreationState = {
					status: "issued",
					link: { id: link.id, url: link.url },
				};

				client.setQueryData(attemptKey, issued);
			}

			if (result.type === "revoke") {
				const current = readCreation();

				if (current?.status === "issued" && current.link.id === result.id) {
					client.setQueryData(attemptKey, null);
				}
			}

			onSaved(result);
			await client.invalidateQueries({ queryKey, exact: true });
		},
	});

	function startCreation(input: GuestLinkInput) {
		const current = readCreation();

		if (current && current.status !== "issued") return;

		const key = crypto.randomUUID();
		const pending: CreationAttempt = { key, input, status: "pending" };

		client.setQueryData(attemptKey, pending);
		mutation.mutate({ type: "create", input, key });
	}

	function acknowledgeUnknownCreation() {
		const current = readCreation();

		if (current?.status === "unknown") client.setQueryData(attemptKey, null);
	}

	const issued = creation?.status === "issued" ? creation.link : null;
	const attempt = creation?.status === "issued" ? null : creation;

	return {
		mutation,
		attempt,
		issued,
		startCreation,
		acknowledgeUnknownCreation,
	};
}
