import type { WarehouseCommand } from "@/domain/warehouse";

export type LayoutCommand = Extract<
	WarehouseCommand,
	{ action: "saveMap" | "resize" | "discard" }
>;

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

export function isLayoutCommand(
	command: WarehouseCommand,
): command is LayoutCommand {
	return (
		command.action === "saveMap" ||
		command.action === "resize" ||
		command.action === "discard"
	);
}

export function blocksLayoutWrite(operation: LayoutOperation | null) {
	return (
		operation?.status === "sending" ||
		operation?.status === "unknown" ||
		operation?.status === "refreshing" ||
		operation?.status === "refresh-failed"
	);
}
