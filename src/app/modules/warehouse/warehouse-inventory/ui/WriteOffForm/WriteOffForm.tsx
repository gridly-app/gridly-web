import {
	type CommandPayloads,
	type Stock,
	writeOffLimit,
} from "@/domain/warehouse";
import { Input, Textarea } from "@/shared/ui/controls";
import { Field, FormShell } from "@/shared/ui/forms";

import {
	writeOffFromForm,
	writeOffReasonMaxLength,
} from "../../model/writeOffFromForm";

export function WriteOffForm({
	stock,
	isPending,
	onSave,
}: {
	stock: Stock;
	isPending: boolean;
	onSave: (payload: CommandPayloads["writeoff"]) => Promise<void>;
}) {
	function handleSubmit(data: FormData) {
		return onSave(writeOffFromForm(data, stock));
	}

	return (
		<FormShell
			submitVariant="destructive"
			pending={isPending}
			submitLabel="Подтвердить списание"
			onSubmit={handleSubmit}
		>
			<p>Списание уменьшит остаток партии и добавит запись в историю.</p>
			<p>Доступно к списанию: {stock.availableQuantity ?? "—"} шт.</p>
			<Field label="Количество *">
				<Input
					name="quantity"
					type="number"
					min={1}
					max={writeOffLimit(stock)}
					step={1}
					defaultValue={1}
					required
				/>
			</Field>
			<Field label="Причина *">
				<Textarea name="reason" required maxLength={writeOffReasonMaxLength} />
			</Field>
		</FormShell>
	);
}
