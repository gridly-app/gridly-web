import { expect, test } from "bun:test";

import { storedWorkflowPolicySchema } from "./workflowPolicy";

test("a saved partial policy preserves existing choices and fills missing confirmations", () => {
	expect(storedWorkflowPolicySchema.parse([true, false, true])).toEqual({
		confirmUnload: true,
		confirmPick: false,
		confirmPutaway: true,
		confirmLoad: false,
	});
});

test("a malformed policy cannot silently change confirmation requirements", () => {
	expect(
		storedWorkflowPolicySchema.safeParse([true, false, true, false, true])
			.success,
	).toBe(false);
	expect(
		storedWorkflowPolicySchema.safeParse({ confirmUnload: true }).success,
	).toBe(false);
});
