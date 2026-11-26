import { ApiError } from "@/shared/http";

const deniedStatuses = [401, 403, 404, 410];

export function isGuestAccessDenied(error: unknown) {
	return error instanceof ApiError && deniedStatuses.includes(error.status);
}
