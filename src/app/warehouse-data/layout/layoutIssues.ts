import { z } from "zod";
import type { LayoutIssue } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";

const location = z.object({
	x: z.number().int().nonnegative(),
	y: z.number().int().nonnegative(),
});

const violation = z
	.object({
		message: z.string().trim().min(1),
		field: z.string().optional(),
		cell_key: z
			.string()
			.regex(/^\d+,\d+$/)
			.optional(),
		cell: location.optional(),
	})
	.and(location.partial());

const issueList = z.array(z.unknown());
const envelope = z.object({
	violations: issueList.optional(),
	errors: issueList.optional(),
});

export function layoutIssues(error: unknown): LayoutIssue[] {
	if (
		!(error instanceof ApiError) ||
		(error.status !== 400 && error.status !== 422)
	)
		return [];

	const direct = issueList.safeParse(error.details);
	const wrapped = envelope.safeParse(error.details);
	const candidates = direct.success
		? direct.data
		: (wrapped.data?.violations ?? wrapped.data?.errors ?? []);

	const issues = new Map<string, LayoutIssue>();

	for (const candidate of candidates) {
		const parsed = violation.safeParse(candidate);
		if (!parsed.success) continue;

		const { message, field, cell_key, cell, x, y } = parsed.data;
		const position =
			cell ?? (x !== undefined && y !== undefined ? { x, y } : undefined);
		const cellKey = cell_key ?? (position && `${position.x},${position.y}`);

		if (cellKey) {
			issues.set(JSON.stringify(["cell", cellKey, message]), {
				kind: "cell",
				key: cellKey,
				message,
			});
		} else if (field) {
			issues.set(JSON.stringify(["field", field, message]), {
				kind: "field",
				field,
				message,
			});
		}
	}

	return [...issues.values()];
}
