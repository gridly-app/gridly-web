import { z } from "zod";

export const workflowKeys = [
	"confirmUnload",
	"confirmPick",
	"confirmPutaway",
	"confirmLoad",
] as const;

export const workflowPolicySchema = z.object({
	confirmUnload: z.boolean(),
	confirmPick: z.boolean(),
	confirmPutaway: z.boolean(),
	confirmLoad: z.boolean(),
});

export type WorkflowPolicy = z.infer<typeof workflowPolicySchema>;

export function emptyWorkflowPolicy(): WorkflowPolicy {
	return {
		confirmUnload: false,
		confirmPick: false,
		confirmPutaway: false,
		confirmLoad: false,
	};
}

export function legacyWorkflowPolicy(values: boolean[]): WorkflowPolicy {
	return {
		confirmUnload: values[0] ?? false,
		confirmPick: values[1] ?? false,
		confirmPutaway: values[2] ?? false,
		confirmLoad: values[3] ?? false,
	};
}

export const storedWorkflowPolicySchema = z.union([
	workflowPolicySchema,
	z.array(z.boolean()).max(4).transform(legacyWorkflowPolicy),
]);
