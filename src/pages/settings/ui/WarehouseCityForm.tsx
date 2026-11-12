import { useState } from "react";
import type { Warehouse, WarehouseSettingsChange } from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { ErrorNotice, Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions, Select } from "@/shared/ui/forms";
import cities from "../config/cities.json";
import { useSettingsDraft } from "../model/useSettingsDraft";

export function WarehouseCityForm({
	settings,
	canEdit,
	busy,
	saving,
	saveCity,
}: {
	settings: Warehouse["settings"];
	canEdit: boolean;
	busy: boolean;
	saving: boolean;
	saveCity: (value: WarehouseSettingsChange) => Promise<boolean>;
}) {
	const rawCity = (settings?.location || "").trim();
	const savedCity = cities.some((option) => option.value === rawCity)
		? rawCity
		: rawCity.split(",")[0]?.trim() || "";
	const cityDraft = useSettingsDraft(savedCity, settings?.revision);
	const city = cityDraft.value;
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const options =
		city && !cities.some((option) => option.value === city)
			? [{ value: city, label: city }, ...cities]
			: cities;

	async function save() {
		if (
			!canEdit ||
			busy ||
			cityDraft.revision === undefined ||
			!city ||
			city === savedCity
		)
			return;
		setError("");
		setMessage("");
		try {
			if (await saveCity({ revision: cityDraft.revision, location: city })) {
				cityDraft.reset();
				setMessage("Сохранено");
			}
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
		>
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
			<FormActions>
				<Button
					type="submit"
					loading={saving}
					disabled={!canEdit || busy || !city || city === savedCity}
					tooltip={!canEdit ? "Изменение расположения недоступно" : undefined}
				>
					Сохранить город
				</Button>
				{cityDraft.dirty && (
					<Button
						type="button"
						variant="secondary"
						disabled={busy}
						onClick={() => {
							cityDraft.reset();
							setError("");
							setMessage("");
						}}
					>
						Вернуть сохранённый город
					</Button>
				)}
			</FormActions>
		</Form>
	);
}
