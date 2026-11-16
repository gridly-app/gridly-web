export type AuthMode = "login" | "register";
export type Credentials = { login: string; password: string };

export interface SandboxSnapshot {
	status: "idle" | "starting" | "active" | "expired" | "error";
	access: {
		access_id: string;
		initial_warehouse_id: string;
		last_warehouse_id?: string | undefined;
	} | null;
	error: string;
}

export interface SandboxController {
	subscribe(listener: () => void): () => void;
	getSnapshot(): SandboxSnapshot;
	restore(): Promise<void>;
	start(restart?: boolean): Promise<void>;
	rememberWarehouse(id: string): void;
	end(): void;
}
