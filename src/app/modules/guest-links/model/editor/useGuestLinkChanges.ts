import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { HttpClient } from "@/shared/http";

import type {
	GuestLink,
	GuestLinkInput,
	GuestLinkList,
} from "../../api/guestLink.dto";
import { revokeGuestLink, updateGuestLink } from "../../api/guestLinkRequests";
import { useGuestLinksQueryKey } from "../../api/guestLinksQuery";

type Change =
	| { type: "update"; id: string; revision: number; input: GuestLinkInput }
	| { type: "revoke"; id: string };

export function useGuestLinkChanges(
	http: HttpClient,
	path: string,
	onChanged: (change: Change) => void,
) {
	const client = useQueryClient();
	const queryKey = useGuestLinksQueryKey(path);

	function applyChange(change: Change) {
		if (change.type === "revoke") return revokeGuestLink(http, path, change.id);

		return updateGuestLink(
			http,
			path,
			change.id,
			change.revision,
			change.input,
		);
	}

	async function markRevoked(id: string) {
		await client.cancelQueries({ queryKey, exact: true });

		client.setQueryData<GuestLinkList>(queryKey, (current) => {
			if (!current) return;

			const items = current.items.map<GuestLink>((link) =>
				link.id === id ? { ...link, status: "revoked" } : link,
			);

			return { items };
		});
	}

	async function handleSuccess(_result: void, change: Change) {
		if (change.type === "revoke") await markRevoked(change.id);

		onChanged(change);

		await client.invalidateQueries({ queryKey, exact: true });
	}

	const mutation = useMutation({
		mutationFn: applyChange,
		onSuccess: handleSuccess,
	});

	function updateLink(link: GuestLink, input: GuestLinkInput) {
		mutation.mutate({
			type: "update",
			id: link.id,
			revision: link.revision,
			input,
		});
	}

	function revokeLink(id: string) {
		mutation.mutate({ type: "revoke", id });
	}

	return {
		updateLink,
		revokeLink,
		isPending: mutation.isPending,
		isRevoking: mutation.isPending && mutation.variables?.type === "revoke",
		error: mutation.error,
		resetError: mutation.reset,
	};
}
