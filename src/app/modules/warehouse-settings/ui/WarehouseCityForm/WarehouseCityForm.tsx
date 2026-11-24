import { type FormEvent, useState } from "react";
import type { Warehouse, WarehouseSettingsChange } from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions, Select } from "@/shared/ui/forms";
import cities from "../../config/cities.json";
import { useSettingsDraft } from "../../model/useSettingsDraft";

export function WarehouseCityForm({
	settings,
	canEdit,
	busy,
	saving,
	saveCity,
	retrySettings,
}: {
	settings: Warehouse["settings"];
	canEdit: boolean;
	busy: boolean;
	saving: boolean;
	saveCity: (value: WarehouseSettingsChange) => Promise<boolean>;
	retrySettings: () => Promise<unknown>;
}) {
	const savedCity = settings?.location.trim() ?? "";
	const cityDraft = useSettingsDraft(savedCity, settings?.revision);
	const { value: city, revision } = cityDraft;
	const canSave = canEdit && !busy && city !== savedCity;
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const cityOptions =
		city && !cities.some((option) => option.value === city)
			? [{ value: city, label: city }, ...cities]
			: cities;
	const options = [{ value: "", label: "Не указано" }, ...cityOptions];
	const hasConflict =
		cityDraft.dirty && cityDraft.revision !== settings?.revision;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!canSave || revision === undefined) return;

		setError("");
		setMessage("");

		try {
			const saved = await saveCity({ revision, location: city });

			if (!saved) return;

			cityDraft.reset();
			setMessage("Сохранено");
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	function handleRefresh() {
		void retrySettings();
	}

	function handleReset() {
		cityDraft.reset();
		setError("");
		setMessage("");
	}

	return (
		<Form onSubmit={handleSubmit}>
			<h4>Расположение</h4>
			<Field label="Город">
				<Select
					aria-label="Город склада"
					value={city}
					onValueChange={cityDraft.setValue}
					options={options}
					searchable
					searchLabel="Поиск города"
					disabled={busy || !canEdit}
				/>
			</Field>
			<ErrorNotice message={error} />
			{message && <Feedback tone="success">{message}</Feedback>}
			{hasConflict && (
				<Feedback tone="warning">
					Расположение изменилось. На сервере сохранено «
					{savedCity || "Не указано"}». Ваш ввод сохранён.
				</Feedback>
			)}
			<FormActions>
				<Button
					type="button"
					variant="secondary"
					disabled={busy}
					onClick={handleRefresh}
				>
					Загрузить актуальные настройки
				</Button>
				<Button
					type="submit"
					loading={saving}
					disabled={!canSave}
					tooltip={!canEdit ? "Изменение расположения недоступно" : undefined}
				>
					Сохранить город
				</Button>
				{cityDraft.dirty && (
					<Button
						type="button"
						variant="secondary"
						disabled={busy}
						onClick={handleReset}
					>
						Вернуть сохранённый город
					</Button>
				)}
			</FormActions>
		</Form>
	);
}
