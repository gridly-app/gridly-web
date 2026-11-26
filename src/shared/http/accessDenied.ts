import { ApiError } from "./ApiError";

export function isAccessDenied(error: unknown) {
	return (
		error instanceof ApiError && (error.status === 401 || error.status === 403)
	);
}
