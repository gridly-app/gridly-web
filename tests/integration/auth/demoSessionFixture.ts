import { ServerDemoSession } from "@/shared/auth/model/ServerDemoSession";
export const base = "http://gridly-demo.test/api/v1";

export const credentials = (id = "first") => ({
	session_id: id,
	access_token: `demo-${id}`,
	expires_at: new Date(Date.now() + 3600000).toISOString(),
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

export const sessions: ServerDemoSession[] = [];
export function setup(
	transport: (
		input: RequestInfo | URL,
		init?: RequestInit,
	) => Promise<Response> = fetch,
) {
	const storage = memory();
	let clears = 0;
	const session = new ServerDemoSession(
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

export function endDemoSessions() {
	for (const session of sessions.splice(0)) session.end();
}
