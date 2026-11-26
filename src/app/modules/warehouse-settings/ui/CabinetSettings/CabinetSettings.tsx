import { type ChangeEvent, type FormEvent, useState } from "react";
import type { CommandExecutor } from "@/domain/warehouse";
import { errorMessage, useSingleFlight } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions } from "@/shared/ui/forms";
import { useSettingsDraft } from "../../model/useSettingsDraft";
import type { SettingsWarehouse } from "../../model/warehouseFields";
import styles from "../../shared.module.css";

export function CabinetSettings({
	warehouse,
	execute,
	pending,
	retrySettings,
}: {
	warehouse: SettingsWarehouse;
	execute: CommandExecutor;
	pending: boolean;
	retrySettings: () => Promise<unknown>;
}) {
	const flight = useSingleFlight();
	const [message, setMessage] = useState<{
		text: string;
		tone: "success" | "error";
	} | null>(null);
	const settings = warehouse.settings;
	const canEdit = !!warehouse.allowedActions?.includes("edit-settings");
	const draft = useSettingsDraft(
		settings ? String(settings.lowStockThreshold) : "",
		settings?.revision,
	);
	const { value: threshold, revision } = draft;
	const lowStockThreshold = Number(threshold);
	const hasConflict = draft.dirty && revision !== settings?.revision;
	const isBusy = flight.isRunning || pending;
	const canEditThreshold = canEdit && !!settings && !isBusy;
	const canSave =
		canEditThreshold && lowStockThreshold !== settings.lowStockThreshold;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSave || revision === undefined) return;

		await flight.run(() => saveThreshold(revision));
	}

	async function saveThreshold(revision: number) {
		setMessage(null);

		try {
			await execute("warehouseSettings", {
				revision,
				lowStockThreshold,
			});
			draft.reset();
			setMessage({ text: "Настройки сохранены", tone: "success" });
		} catch (error) {
			setMessage({ text: errorMessage(error), tone: "error" });
		}
	}
	function handleThresholdChange(event: ChangeEvent<HTMLInputElement>) {
		draft.setValue(event.currentTarget.value);
	}

	function handleRefresh() {
		void retrySettings();
	}

	function handleReset() {
		draft.reset();
		setMessage(null);
	}

	return (
		<section className={styles.card}>
			<h3>Учёт товаров</h3>
			<Field label="Порядок отбора партий">
				<Input value="FEFO — ближайший срок годности" readOnly />
			</Field>
			<Form onSubmit={handleSubmit}>
				<Field label="Порог низкого остатка, шт.">
					<Input
						type="number"
						min={0}
						step={1}
						required
						value={threshold}
						disabled={!canEditThreshold}
						onChange={handleThresholdChange}
					/>
				</Field>
				{message && <Feedback tone={message.tone}>{message.text}</Feedback>}
				{hasConflict && (
					<Feedback tone="warning">
						Настройки изменились. На сервере сохранён порог{" "}
						{settings?.lowStockThreshold}. Ваш ввод сохранён.
					</Feedback>
				)}
				<FormActions>
					<Button
						type="button"
						variant="secondary"
						disabled={isBusy}
						onClick={handleRefresh}
					>
						Загрузить актуальные настройки
					</Button>
					<Button type="submit" disabled={!canSave}>
						Сохранить порог
					</Button>
					<Button
						type="button"
						variant="secondary"
						disabled={isBusy || !draft.dirty}
						onClick={handleReset}
					>
						Вернуть сохранённое значение
					</Button>
				</FormActions>
			</Form>
		</section>
	);
}
