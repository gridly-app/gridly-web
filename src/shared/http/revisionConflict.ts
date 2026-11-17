import { ApiError } from "./ApiError";

export function isStaleRevision(error: unknown) {
	return (
		error instanceof ApiError &&
		(error.code === "STALE_REVISION" ||
			error.status === 412 ||
			(error.status === 409 && !error.code))
	);
}
