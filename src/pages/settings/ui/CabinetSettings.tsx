import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions } from "@/shared/ui/forms";
import { useSettingsDraft } from "../model/useSettingsDraft";
import styles from "./SettingsPage.module.css";

export function CabinetSettings({
	w,
	execute,
	pending,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);
	const settings = w.settings;
	const inFlight = useRef(false);
	const canEdit = !!w.allowedActions?.includes("edit-settings");
	const draft = useSettingsDraft(
		String(settings?.lowStockThreshold ?? 10),
		settings?.revision,
	);
	const threshold = draft.value;
	async function save() {
		if (pending || inFlight.current || draft.revision === undefined || !canEdit)
			return;
		inFlight.current = true;
		setSaving(true);
		setMessage(null);
		try {
			await execute("warehouseSettings", {
				revision: draft.revision,
				lowStockThreshold: Number(threshold),
			});
			draft.reset();
			setMessage({ text: "Настройки сохранены", tone: "success" });
		} catch (error) {
			setMessage({ text: errorMessage(error), tone: "error" });
		} finally {
			inFlight.current = false;
			setSaving(false);
		}
	}
	return (
		<section className={styles.card}>
			<h3>Учёт товаров</h3>
			<Field label="Порядок отбора партий">
				<Input value="FEFO — ближайший срок годности" readOnly />
			</Field>
			<Form
				onSubmit={(e) => {
					e.preventDefault();
					void save();
				}}
			>
				<Field label="Порог низкого остатка, шт.">
					<Input
						type="number"
						min={0}
						step={1}
						required
						value={threshold}
						disabled={!canEdit || !settings || saving || pending}
						onChange={(event) => draft.setValue(event.target.value)}
					/>
				</Field>
				{message && <Feedback tone={message.tone}>{message.text}</Feedback>}
				<FormActions>
					<Button
						type="submit"
						disabled={
							!canEdit ||
							!settings ||
							pending ||
							saving ||
							Number(threshold) === settings.lowStockThreshold
						}
					>
						Сохранить порог
					</Button>
					<Button
						type="button"
						variant="secondary"
						disabled={saving || pending || !draft.dirty}
						onClick={() => {
							draft.reset();
							setMessage(null);
						}}
					>
						Вернуть сохранённое значение
					</Button>
				</FormActions>
			</Form>
		</section>
	);
}
