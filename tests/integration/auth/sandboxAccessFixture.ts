import { AnonymousSandboxAccess } from "@/app/modules/session/model/AnonymousSandboxAccess";
export const base = "http://gridly-sandbox.test/api/v1";

export const credentials = (id = "first") => ({
	access_id: id,
	access_token: `sandbox-${id}`,
	initial_warehouse_id: `warehouse-${id}`,
});

export function memory() {
	const data = new Map<string, string>([
		["gridly.user", "operator"],
		["gridly.last", "personal"],
	]);
	return {
		data,
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}

export const sessions: AnonymousSandboxAccess[] = [];
export function setup(
	transport: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response> = fetch,
) {
	const storage = memory();
	let clears = 0;
	const session = new AnonymousSandboxAccess(
		storage,
		base,
		() => {
			clears++;
		},
		transport,
	);
	sessions.push(session);
	return { storage, session, clears: () => clears };
}

export function endSandboxSessions() {
	for (const session of sessions.splice(0)) session.end();
}
