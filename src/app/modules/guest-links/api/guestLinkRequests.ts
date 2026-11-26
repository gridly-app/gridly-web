import { ApiError, type HttpClient, parseResponse } from "@/shared/http";

import { createdGuestLinkSchema, type GuestLinkInput } from "./guestLink.dto";

function guestLinkPath(path: string, id: string) {
	return `${path}/${encodeURIComponent(id)}`;
}

function isAlreadyRevoked(error: unknown) {
	return (
		error instanceof ApiError &&
		error.status === 409 &&
		error.code === "LINK_ALREADY_REVOKED"
	);
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
	await http.request(guestLinkPath(path, id), {
		method: "PATCH",
		body: { ...input, revision },
	});
}

export async function revokeGuestLink(
	http: HttpClient,
	path: string,
	id: string,
) {
	try {
		await http.request(guestLinkPath(path, id), { method: "DELETE" });
	} catch (error) {
		if (!isAlreadyRevoked(error)) throw error;
	}
}
