import type { MockStore } from "./mock-http";

const accessPath = "/api/v1/sandbox/access";
const sessionLifetimeMs = 86_400_000;

export function createSandboxMock(
	sandboxTemplate: MockStore,
	onClose: (store: MockStore) => void,
) {
	const sandboxes = new Map<string, MockStore>();

	function get(authorization: string | null) {
		return authorization ? sandboxes.get(authorization) : undefined;
	}

	function handle(
		request: Request,
		pathname: string,
		authorization: string | null,
	) {
		const sandboxAccess = get(authorization);

		if (pathname === accessPath && request.method === "POST") {
			const token = `sandbox-${crypto.randomUUID()}`;
			const access = {
				access_id: token,
				access_token: token,
				expires_at: new Date(Date.now() + sessionLifetimeMs).toISOString(),
				initial_warehouse_id: "warehouse-demo",
			};
			const store = structuredClone(sandboxTemplate);
			store.set(accessPath, {
				access_id: access.access_id,
				expires_at: access.expires_at,
				initial_warehouse_id: access.initial_warehouse_id,
			});
			sandboxes.set(`Bearer ${token}`, store);
			return Response.json(access, { status: 201 });
		}
		if (pathname === accessPath) {
			if (!sandboxAccess || !authorization)
				return Response.json(
					{
						error: {
							code: "SESSION_EXPIRED",
							message: "Доступ к песочнице завершён",
						},
					},
					{ status: 401 },
				);
			if (request.method === "GET")
				return Response.json(sandboxAccess.get(pathname));
			if (request.method === "DELETE") {
				onClose(sandboxAccess);
				sandboxes.delete(authorization);
				return new Response(null, { status: 204 });
			}
		}
		const isSandboxToken = authorization?.startsWith("Bearer sandbox-");

		if (
			isSandboxToken &&
			!sandboxAccess &&
			(pathname.startsWith("/api/v1/warehouses") ||
				pathname.startsWith("/api/v1/sandbox/admin/"))
		) {
			return Response.json(
				{ error: { code: "SESSION_EXPIRED" } },
				{ status: 401 },
			);
		}
	}

	return { get, handle };
}
