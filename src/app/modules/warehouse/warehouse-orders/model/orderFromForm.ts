import type { Order, OrderInput, WorkflowPolicy } from "@/domain/warehouse";
import { formText, UserError } from "@/shared/lib";

interface OrderDraft {
	kind: Order["kind"];
	order?: Order | undefined;
	lines: Order["lines"];
	manual: WorkflowPolicy;
}

function isValidLine(line: Order["lines"][number]) {
	return (
		Boolean(line.product) &&
		Number.isInteger(line.quantity) &&
		line.quantity >= 1
	);
}

export function orderFromForm(
	data: FormData,
	{ kind, order, lines, manual }: OrderDraft,
): OrderInput {
	if (!lines.length || !lines.every(isValidLine)) {
		throw new UserError("Добавьте товар и целое положительное количество");
	}

	return {
		revision: order?.revision,
		id: order?.id,
		kind,
		party: formText(data, "party"),
		lines,
		manual,
	};
}
