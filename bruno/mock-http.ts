export type MockStore = Map<string, unknown>;
export const base = "/api/v1";
export const notFound = () =>
	problem(404, "SHIPMENT_NOT_FOUND", "Отгрузка недоступна");
export const privateHeaders = { "Cache-Control": "no-store" };

export function problem(
	status: number,
	code: string,
	message: string,
	details?: unknown,
) {
	return Response.json(
		{ error: { code, message, details } },
		{ status, headers: privateHeaders },
	);
}

export const invalidJson = Symbol("invalid JSON");

export async function readMutation(request: Request): Promise<unknown> {
	if (request.method !== "POST" && request.method !== "PATCH") return undefined;
	try {
		return await request.json();
	} catch (error) {
		if (!(error instanceof SyntaxError)) throw error;
		return invalidJson;
	}
}
