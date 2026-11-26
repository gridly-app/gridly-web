import type { LayoutIssue, LayoutOperation } from "@/ports/warehouse";

function issuesOf(
	operation: LayoutOperation | null,
	action: LayoutOperation["command"]["action"],
) {
	return operation?.command.action === action ? operation.issues : undefined;
}

function fieldError(issues: readonly LayoutIssue[] | undefined, field: string) {
	return issues?.find(
		(issue) => issue.kind === "field" && issue.field === field,
	)?.message;
}

export function layoutIssueView(
	operation: LayoutOperation | null,
	selectedKey: string | null,
) {
	const saveIssues = issuesOf(operation, "saveMap");
	const resizeIssues = issuesOf(operation, "resize");
	const cellErrors = saveIssues
		?.filter((issue) => issue.kind === "cell" && issue.key === selectedKey)
		.map((issue) => issue.message);

	return {
		saveIssues,
		widthError: fieldError(resizeIssues, "width"),
		heightError: fieldError(resizeIssues, "height"),
		cellErrors,
	};
}
