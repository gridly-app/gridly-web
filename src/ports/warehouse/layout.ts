import type { LayoutCommand } from "@/domain/warehouse";

export type LayoutIssue =
	| { kind: "field"; field: string; message: string }
	| { kind: "cell"; key: string; message: string };

export interface LayoutOperation {
	issues?: readonly LayoutIssue[];
	command: LayoutCommand;
	status:
		| "sending"
		| "unknown"
		| "conflict"
		| "rejected"
		| "refreshing"
		| "refresh-failed";
}

export function blocksLayoutWrite(operation: LayoutOperation | null) {
	return (
		operation?.status === "sending" ||
		operation?.status === "unknown" ||
		operation?.status === "refreshing" ||
		operation?.status === "refresh-failed"
	);
}
