import type { SandboxAccessData } from "./sandboxAccessStorage";

export type SandboxStatus =
	"idle" | "starting" | "active" | "expired" | "error";

export interface SandboxSnapshot {
	status: SandboxStatus;
	access: SandboxAccessData | null;
	error: string;
}

export type SandboxTransport = (
	input: RequestInfo | URL,
	init?: RequestInit | undefined,
) => Promise<Response>;
