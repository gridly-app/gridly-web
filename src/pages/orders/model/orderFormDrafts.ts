import { z } from "zod";
import type { Order, Warehouse } from "@/entities/warehouse";
import { storedWorkflowPolicySchema } from "@/entities/warehouse";
import type { KeyValueStorage } from "@/shared/lib";
import { formDraftPrefix } from "@/shared/lib/forms/formDraftStorage";

const formValuesSchema = z.object({
	party: z.string(),
	lines: z.array(
		z.object({
			key: z.string(),
			id: z.string().optional(),
			product: z.string(),
			quantity: z.string(),
			expires: z.string(),
		}),
	),
	manual: storedWorkflowPolicySchema,
});
const savedFormSchema = z.object({
	version: z.literal(2).default(2),
	id: z.string(),
	updatedAt: z.iso.datetime(),
	values: formValuesSchema,
});
export type OrderFormValues = z.infer<typeof formValuesSchema>;
export type SavedOrderForm = z.infer<typeof savedFormSchema>;

export function initialOrderForm(
	warehouse: Warehouse,
	order?: Order | undefined,
): OrderFormValues {
	return {
		party: order?.party ?? "",
		lines: (
			order?.lines ?? [
				{
					product: warehouse.products.find((p) => !p.archived)?.id ?? "",
					quantity: 1,
					expires: "",
				},
			]
		).map((line) => ({
			...line,
			quantity: String(line.quantity),
			key: crypto.randomUUID(),
		})),
		manual: { ...(order?.manual ?? warehouse.policy) },
	};
}

export class OrderFormDrafts {
	private readonly key: string;
	constructor(
		private readonly storage: KeyValueStorage,
		scope: readonly string[],
		warehouseId: string,
		kind: Order["kind"],
	) {
		this.key = `${formDraftPrefix(scope)}${JSON.stringify([warehouseId, kind])}`;
	}
	read(): SavedOrderForm[] {
		const saved = this.storage.getItem(this.key);
		try {
			const raw: unknown = JSON.parse(saved ?? "[]");
			if (!Array.isArray(raw)) return [];
			return raw.flatMap((entry) => {
				const parsed = savedFormSchema.safeParse(entry);
				return parsed.success ? [parsed.data] : [];
			});
		} catch (error) {
			if (error instanceof SyntaxError) return [];
			throw error;
		}
	}
	save(form: Omit<SavedOrderForm, "version"> & { version?: 2 | undefined }) {
		const valid = savedFormSchema.parse(form);
		const next = [
			valid,
			...this.read().filter((entry) => entry.id !== valid.id),
		];
		this.storage.setItem(this.key, JSON.stringify(next));
		return next;
	}
	remove(id: string) {
		const current = this.read();
		const next = current.filter((entry) => entry.id !== id);
		if (next.length === current.length) return current;
		this.storage.setItem(this.key, JSON.stringify(next));
		return next;
	}
}
