export interface AccountSnapshot {
	scopeId: number;
	sessionId: string | null;
	status: "restoring" | "active" | "ended" | "error";
	user: string;
	error: string;
}
