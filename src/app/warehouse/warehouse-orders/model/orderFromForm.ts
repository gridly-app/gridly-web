import type { Order, OrderInput, WorkflowPolicy } from "@/domain/warehouse";
import { formText, UserError } from "@/shared/lib";

interface OrderDraft {
	kind: Order["kind"];
	order?: Order | undefined;
	lines: Order["lines"];
	manual: WorkflowPolicy;
}

export function orderFromForm(
	data: FormData,
	{ kind, order, lines, manual }: OrderDraft,
): OrderInput {
	if (
		!lines.length ||
		lines.some(
			(line) =>
				!line.product || line.quantity < 1 || !Number.isInteger(line.quantity),
		)
	) {
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
