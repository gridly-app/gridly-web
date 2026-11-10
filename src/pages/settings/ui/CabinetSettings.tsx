import { useRef, useState } from "react";
import type { CommandExecutor, Warehouse } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { Button, Feedback, Field, Form, FormActions, Input } from "@/shared/ui";
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
	const [draft, setDraft] = useState<{
		value: string;
		revision: number;
	} | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);
	const settings = w.settings;
	const inFlight = useRef(false);
	const canEdit = !!w.allowedActions?.includes("edit-settings");
	const threshold = draft?.value ?? String(settings?.lowStockThreshold ?? 10);
	async function save() {
		if (pending || inFlight.current || !settings || !canEdit) return;
		inFlight.current = true;
		setSaving(true);
		setMessage(null);
		try {
			await execute("warehouseSettings", {
				revision: draft?.revision ?? settings.revision,
				lowStockThreshold: Number(threshold),
			});
			setDraft(null);
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
						onChange={(e) => {
							if (settings)
								setDraft({
									value: e.target.value,
									revision: draft?.revision ?? settings.revision,
								});
						}}
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
						disabled={saving || pending || !draft}
						onClick={() => {
							setDraft(null);
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
