import { expect, test } from "bun:test";

import { changeLabel } from "./auditChangeLabel";

test("change labels preserve API labels and do not read inherited object properties", () => {
	expect(
		changeLabel({
			field: "published",
			label: "Custom",
			before: null,
			after: true,
		}),
	).toBe("Custom");
	expect(changeLabel({ field: "constructor", before: null, after: null })).toBe(
		"constructor",
	);
});
