import { IconRefresh } from "@tabler/icons-react";
import type { ChangeEvent, FormEvent } from "react";
import { Button, IconButton, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions, FormGrid } from "@/shared/ui/forms";
import {
	type SettingsCommandOptions,
	useNameSettings,
} from "../../model/useNameSettings";
import styles from "../../shared.module.css";
import { LocationAndMapSettings } from "../LocationAndMapSettings/LocationAndMapSettings";

export function GeneralSettings({
	retrySettings,
	...options
}: SettingsCommandOptions & { retrySettings: () => Promise<unknown> }) {
	const { warehouse } = options;
	const model = useNameSettings(options);
	const saveHint = model.isChanged
		? undefined
		: "Измените название, чтобы сохранить";

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void model.save();
	}

	function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
		model.changeName(event.target.value);
	}

	return (
		<section className={`${styles.card} ${styles.general}`}>
			<h3>Основные параметры</h3>
			<Form onSubmit={handleSubmit}>
				<FormGrid>
					<Field label="Название склада">
						<Input
							name="name"
							value={model.name}
							onChange={handleNameChange}
							required
							maxLength={80}
							disabled={model.isBusy}
						/>
					</Field>
					<Field label="Часовой пояс">
						<Input value={warehouse.timezone} readOnly />
					</Field>
				</FormGrid>
				{model.message && (
					<Feedback tone={model.message.tone}>{model.message.text}</Feedback>
				)}
				<FormActions>
					<Button
						type="submit"
						disabled={model.isBusy || !model.isChanged}
						title={saveHint}
						aria-label="Сохранить название"
					>
						Сохранить
					</Button>
					<IconButton
						label="Вернуть сохранённые значения"
						icon={<IconRefresh size={16} />}
						onClick={model.refresh}
						disabled={model.isBusy}
					/>
				</FormActions>
			</Form>
			<LocationAndMapSettings
				warehouse={warehouse}
				execute={options.execute}
				pending={options.pending}
				retrySettings={retrySettings}
			/>
		</section>
	);
}
