import { AnonymousSandboxAccess } from "./AnonymousSandboxAccess";

export type Transport = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export const base = "http://gridly-sandbox.test/api/v1";

export const sessions: AnonymousSandboxAccess[] = [];

export function credentials(id = "first") {
	return {
		access_id: id,
		access_token: `sandbox-${id}`,
		initial_warehouse_id: `warehouse-${id}`,
	};
}

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

export function setup(transport: Transport = fetch) {
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
