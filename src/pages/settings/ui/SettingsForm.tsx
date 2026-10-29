import { useId } from "react";
import {
	Button,
	Combobox,
	ErrorNotice,
	Field,
	Form,
	Input,
	Switch,
} from "@/shared/ui";
import type { SettingsFormOptions } from "../model/useSettingsForm";
import { useSettingsForm } from "../model/useSettingsForm";
import localLayout from "./Layout.module.css";
import settingsStyles from "./SettingsPage.module.css";

export type SettingsFormProps = SettingsFormOptions;

export function SettingsForm(props: SettingsFormProps) {
	const controlId = useId();
	const {
		handleSubmit,
		w: warehouse,
		confirmations,
		updatePolicy,
		error,
		pending,
	} = useSettingsForm(props);

	return (
		<Form
			className={settingsStyles.settings}
			onSubmit={(event) => {
				void handleSubmit(event);
			}}
		>
			<h3>Основные параметры</h3>
			<Field className={settingsStyles.field} label="Название склада">
				<Input
					name="name"
					defaultValue={warehouse.name}
					required
					maxLength={80}
					disabled={pending}
				/>
			</Field>
			<Field className={settingsStyles.field} label="Часовой пояс">
				<Combobox
					name="timezone"
					defaultValue={warehouse.timezone}
					disabled={pending}
					options={[
						"Europe/Moscow",
						"Europe/Kaliningrad",
						"Asia/Yekaterinburg",
						"Asia/Novosibirsk",
					].map((value) => ({ value, label: value }))}
				/>
			</Field>
			<hr />
			<h3>Ручные подтверждения</h3>
			<p className={localLayout.muted}>
				Эти значения будут использоваться для новых заказов.
			</p>
			{confirmations.map((confirmation) => (
				<label
					className={settingsStyles.switchRow}
					key={confirmation.label}
					htmlFor={`${controlId}-${confirmation.index}`}
				>
					<span>{confirmation.label}</span>
					<Switch
						className={settingsStyles.switch}
						id={`${controlId}-${confirmation.index}`}
						checked={confirmation.checked}
						onCheckedChange={(checked) =>
							updatePolicy(confirmation.index, checked)
						}
						disabled={pending}
					/>
				</label>
			))}
			<ErrorNotice message={error} />
			<Button
				className={settingsStyles.submit}
				variant="default"
				type="submit"
				disabled={pending}
			>
				Сохранить настройки
			</Button>
		</Form>
	);
}
