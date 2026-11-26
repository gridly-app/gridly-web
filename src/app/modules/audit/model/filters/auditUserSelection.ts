type AuditUserKind = "account" | "guest";

function isAuditUserKind(source: string): source is AuditUserKind {
	return source === "account" || source === "guest";
}

export function auditUserSelection(
	user: string,
	source: string,
): { user: string; user_kind?: AuditUserKind } {
	return isAuditUserKind(source) ? { user, user_kind: source } : { user };
}
