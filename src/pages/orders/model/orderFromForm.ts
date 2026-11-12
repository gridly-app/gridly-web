import type {
	Order,
	OrderInput,
	Warehouse,
	WorkflowPolicy,
} from "@/entities/warehouse";
import { formText, UserError } from "@/shared/lib";

export interface OrderDraft {
	kind: Order["kind"];
	order?: Order | undefined;
	warehouse: Warehouse;
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
