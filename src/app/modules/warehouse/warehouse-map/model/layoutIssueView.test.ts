import { expect, test } from "bun:test";

import type { LayoutOperation } from "@/ports/warehouse";
import { layoutIssueView } from "./layoutIssueView";

function rejected(
	action: "saveMap" | "resize",
	issues: NonNullable<LayoutOperation["issues"]>,
): LayoutOperation {
	const command: LayoutOperation["command"] =
		action === "saveMap"
			? { action, value: { baseVersion: 1, cells: [], routes: [] } }
			: { action, value: { width: 3, height: 3 } };

	return { status: "rejected", command, issues };
}

test("a rejected save shows only the selected cell's errors", () => {
	const view = layoutIssueView(
		rejected("saveMap", [
			{ kind: "cell", key: "1,1", message: "Нет прохода" },
			{ kind: "cell", key: "2,2", message: "Стена у зарядки" },
			{ kind: "field", field: "width", message: "Слишком широко" },
		]),
		"1,1",
	);

	expect(view.cellErrors).toEqual(["Нет прохода"]);
	expect(view.saveIssues).toHaveLength(3);
	expect(view.widthError).toBeUndefined();
});

test("a rejected resize shows width and height errors and no cell errors", () => {
	const view = layoutIssueView(
		rejected("resize", [
			{ kind: "field", field: "width", message: "Ширина больше 100" },
			{ kind: "field", field: "height", message: "Высота меньше 1" },
		]),
		"1,1",
	);

	expect(view.widthError).toBe("Ширина больше 100");
	expect(view.heightError).toBe("Высота меньше 1");
	expect(view.saveIssues).toBeUndefined();
	expect(view.cellErrors).toBeUndefined();
});

test("without an operation there is nothing to show", () => {
	expect(layoutIssueView(null, null)).toEqual({
		saveIssues: undefined,
		widthError: undefined,
		heightError: undefined,
		cellErrors: undefined,
	});
});
