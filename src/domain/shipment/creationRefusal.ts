import { z } from "zod";

const refusedStatuses = new Set([400, 401, 403, 404, 409, 412, 413, 422]);
const refusedCodes = new Set(["STALE_DOCUMENT_VERSION"]);
const errorResponse = z.object({
	status: z.number(),
	code: z.string().optional(),
});

export function isRefusedCreation(error: unknown) {
	const response = errorResponse.safeParse(error);

	if (!response.success) return false;

	const { status, code } = response.data;

	return refusedStatuses.has(status) || refusedCodes.has(code ?? "");
}
