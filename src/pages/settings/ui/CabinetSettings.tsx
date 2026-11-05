import { IconRefresh } from "@tabler/icons-react";
import { useId, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	Button,
	Checkbox,
	Feedback,
	Field,
	Form,
	FormActions,
	IconButton,
	Input,
	Label,
	Select,
} from "@/shared/ui";

import styles from "./SettingsPage.module.css";

const defaults: NonNullable<Warehouse["cabinet"]> = {
	location: "",
	placement: "fefo",
	allowMixedCategories: false,
	reserveOnStart: true,
	lowStockThreshold: 10,
};
export function CabinetSettings({
	w,
	execute,
	pending,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const mixedId = useId(),
		reserveId = useId();
	const [cabinet, setCabinet] = useState(w.cabinet ?? defaults);
	const [message, setMessage] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);
	const [saving, setSaving] = useState(false);
	const canEdit = !!w.allowedActions?.includes("edit-settings");
	const busy = pending || saving;
	async function saveCabinet() {
		setSaving(true);
		setMessage(null);
		try {
			await execute("cabinet", {
				...cabinet,
				location: w.cabinet?.location || w.location || "",
				reportViews: w.cabinet?.reportViews,
			});
			setMessage({ text: "Настройки сохранены", tone: "success" });
		} catch (e) {
			setMessage({ text: errorMessage(e), tone: "error" });
		} finally {
			setSaving(false);
		}
	}
	return (
		<section className={styles.card}>
			<Form
				onSubmit={(e) => {
					e.preventDefault();
					void saveCabinet();
				}}
			>
				<h3>Размещение товаров</h3>

				<Field label="Правило размещения">
					<Select
						aria-label="Правило размещения"
						value={cabinet.placement}
						onValueChange={(v) =>
							setCabinet({ ...cabinet, placement: v as "fifo" | "fefo" })
						}
						options={[
							{ value: "fifo", label: "FIFO — сначала поступившие" },
							{ value: "fefo", label: "FEFO — ближайший срок годности" },
						]}
					/>
				</Field>
				<Label htmlFor={mixedId}>
					<Checkbox
						id={mixedId}
						checked={cabinet.allowMixedCategories}
						onCheckedChange={(v) =>
							setCabinet({ ...cabinet, allowMixedCategories: v })
						}
					/>{" "}
					Смешивать категории в зоне
				</Label>
				<Label htmlFor={reserveId}>
					<Checkbox
						id={reserveId}
						checked={cabinet.reserveOnStart}
						onCheckedChange={(v) =>
							setCabinet({ ...cabinet, reserveOnStart: v })
						}
					/>{" "}
					Резервировать остатки при запуске заказа
				</Label>
				<Field label="Порог низкого остатка, шт.">
					<Input
						type="number"
						min={0}
						step={1}
						required
						value={cabinet.lowStockThreshold}
						onChange={(e) =>
							setCabinet({
								...cabinet,
								lowStockThreshold: Number(e.target.value),
							})
						}
					/>
				</Field>
				{message && <Feedback tone={message.tone}>{message.text}</Feedback>}
				<FormActions>
					<Button
						type="submit"
						disabled={busy || !canEdit}
						tooltip={
							!canEdit ? "Сохранение настроек размещения недоступно" : undefined
						}
					>
						Сохранить
					</Button>
					<IconButton
						type="button"
						label="Сбросить размещение товаров до значений по умолчанию"
						tooltip="Сбросить до значений по умолчанию"
						icon={<IconRefresh size={16} />}
						disabled={busy}
						onClick={() => {
							setCabinet((current) => ({
								...current,
								placement: defaults.placement,
								allowMixedCategories: defaults.allowMixedCategories,
								reserveOnStart: defaults.reserveOnStart,
								lowStockThreshold: defaults.lowStockThreshold,
							}));
							setMessage(null);
						}}
					/>
				</FormActions>
			</Form>
		</section>
	);
}
