import type { CommandPayloads, Stock } from "@/entities/warehouse";
import { Field, FormShell, Input, Textarea } from "@/shared/ui";
import { writeOffFromForm } from "../model/writeOffFromForm";

export interface WriteOffFormProps {
	stock: Stock;
	onSave: (payload: CommandPayloads["writeoff"]) => Promise<void>;
	pending: boolean;
}

export function WriteOffForm({ stock, pending, onSave }: WriteOffFormProps) {
	return (
		<FormShell
			pending={pending}
			submitLabel="Подтвердить списание"
			onSubmit={(data) => onSave(writeOffFromForm(data, stock))}
		>
			<p>Списание уменьшит остаток партии и добавит запись в историю.</p>
			<Field label="Количество *">
				<Input
					name="quantity"
					type="number"
					min={1}
					defaultValue={1}
					required
				/>
			</Field>
			<Field label="Причина *">
				<Textarea name="reason" required maxLength={500} />
			</Field>
		</FormShell>
	);
}
