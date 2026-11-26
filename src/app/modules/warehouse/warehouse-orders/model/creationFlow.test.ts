import { expect, test } from "bun:test";

import { warehouse } from "../../../../../../tests/support/warehouse";
import { creationFlowReducer } from "./useOrderCreation";

const values = { party: "", manual: warehouse().policy, lines: [] };
const creation = { id: "form-1", values, baseline: JSON.stringify(values) };
const editing = { kind: "editing" as const, creation };

test("a confirmed order closes only the form it was submitted from", () => {
	const submitting = creationFlowReducer(editing, { type: "submit" });

	expect(
		creationFlowReducer(submitting, { type: "submitted", formId: "form-2" }),
	).toEqual(submitting);
	expect(
		creationFlowReducer(submitting, { type: "submitted", formId: "form-1" }),
	).toEqual({ kind: "closed" });
});

test("a finished submission returns an open form to editing", () => {
	const submitting = creationFlowReducer(editing, { type: "submit" });

	expect(creationFlowReducer(submitting, { type: "submitEnded" })).toEqual(
		editing,
	);
	expect(
		creationFlowReducer({ kind: "closed" }, { type: "submitEnded" }),
	).toEqual({ kind: "closed" });
});

test("closing the chooser does not close an open form", () => {
	expect(
		creationFlowReducer({ kind: "choosing" }, { type: "closeChooser" }),
	).toEqual({ kind: "closed" });
	expect(creationFlowReducer(editing, { type: "closeChooser" })).toEqual(
		editing,
	);
});

test("asking to close a changed form waits for confirmation", () => {
	const confirming = creationFlowReducer(editing, { type: "askToClose" });

	expect(confirming.kind).toBe("confirming");
	expect(creationFlowReducer(confirming, { type: "continue" })).toEqual(
		editing,
	);
});
