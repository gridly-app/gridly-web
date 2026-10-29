import { ApiError } from "@/shared/api";

type Issue = {
	message: string;
	field?: string | undefined;
	cell_key?: string | undefined;
	route_id?: string | undefined;
};

export function errorMessage(error: unknown): string {
	if (!(error instanceof Error)) return "Не удалось выполнить действие";
	if (
		!(error instanceof ApiError) ||
		!error.details ||
		typeof error.details !== "object"
	)
		return error.message;
	const issues = (error.details as { issues?: unknown | undefined }).issues;
	if (!Array.isArray(issues)) return error.message;
	const messages = issues
		.filter(
			(issue): issue is Issue =>
				typeof issue === "object" &&
				issue !== null &&
				typeof issue.message === "string",
		)
		.map((issue) =>
			[issue.field, issue.cell_key, issue.route_id, issue.message]
				.filter(Boolean)
				.join(": "),
		);
	return [error.message, ...messages].join(" · ");
}
