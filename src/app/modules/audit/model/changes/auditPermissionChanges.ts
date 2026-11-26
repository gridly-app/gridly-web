import type { AuditEvent } from "@/domain/shipment";

function permissionList(value: unknown) {
	if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
		return null;

	return [...new Set(value)];
}

export function permissionChanges(change: AuditEvent["changes"][number]) {
	if (change.field !== "permissions") return;

	const before = permissionList(change.before);
	const after = permissionList(change.after);

	if (!before || !after) return;

	const previous = new Set(before);
	const next = new Set(after);

	return {
		before,
		after,
		added: after.filter((item) => !previous.has(item)),
		removed: before.filter((item) => !next.has(item)),
	};
}

export type PermissionDiff = NonNullable<ReturnType<typeof permissionChanges>>;
