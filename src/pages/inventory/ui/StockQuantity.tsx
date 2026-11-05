import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { Stock } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { ErrorNotice, IconButton, Input } from "@/shared/ui";

export function StockQuantity({
	stock,
	editable,
	pending,
	onSave,
}: {
	stock: Stock;
	editable: boolean;
	pending: boolean;
	onSave: (stock: Stock) => Promise<void>;
}) {
	const [editing, setEditing] = useState<Stock | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	if (!editing || !editable)
		return (
			<div className="flex items-center gap-1">
				{stock.quantity.toLocaleString("ru-RU")} шт.
				{editable && (
					<IconButton
						label="Изменить количество"
						icon={<IconPencil size={15} />}
						disabled={pending}
						onClick={() => setEditing(stock)}
					/>
				)}
			</div>
		);

	return (
		<form
			onSubmit={async (event) => {
				event.preventDefault();
				if (pending || saving || editing.quantity === stock.quantity) return;
				setSaving(true);
				setError("");
				try {
					await onSave(editing);
					setEditing(null);
				} catch (failure) {
					setError(errorMessage(failure));
				} finally {
					setSaving(false);
				}
			}}
		>
			<div className="flex items-center gap-1">
				<Input
					className="w-24"
					aria-label="Количество партии"
					type="number"
					min={editing.reserved ?? 0}
					step={1}
					required
					value={Number.isNaN(editing.quantity) ? "" : editing.quantity}
					disabled={saving}
					onChange={(event) =>
						setEditing({ ...editing, quantity: event.target.valueAsNumber })
					}
				/>
				<IconButton
					type="submit"
					label="Сохранить количество"
					icon={<IconCheck size={16} />}
					disabled={pending || saving || editing.quantity === stock.quantity}
				/>
				<IconButton
					label="Отменить изменение"
					icon={<IconX size={16} />}
					disabled={saving}
					onClick={() => {
						setEditing(null);
						setError("");
					}}
				/>
			</div>
			<ErrorNotice message={error} />
		</form>
	);
}
