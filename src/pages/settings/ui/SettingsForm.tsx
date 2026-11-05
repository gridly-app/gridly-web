import { IconRefresh } from "@tabler/icons-react";
import { useId } from "react";
import {
	Button,
	Field,
	Form,
	FormActions,
	IconButton,
	Input,
	Label,
	Switch,
} from "@/shared/ui";
import {
	type SettingsFormOptions,
	useSettingsForm,
} from "../model/useSettingsForm";
import { LocationAndMapSettings } from "./LocationAndMapSettings";
import styles from "./SettingsPage.module.css";

export function SettingsForm({
	section,
	...props
}: SettingsFormOptions & { section: "general" | "confirmations" }) {
	const id = useId();
	const model = useSettingsForm(props);
	return (
		<div className={styles.sections}>
			{section === "general" && (
				<Form
					onSubmit={(event) => {
						event.preventDefault();
						void model.save("name");
					}}
				>
					<h3>Основные параметры</h3>
					<Field label="Название склада">
						<Input
							name="name"
							value={model.name}
							onChange={(event) => model.changeName(event.target.value)}
							required
							maxLength={80}
							disabled={model.pending}
						/>
					</Field>

					<Field label="Часовой пояс">
						<Input value={model.w.timezone} readOnly />
					</Field>
					<p role="status">{model.messages.name}</p>
					<FormActions>
						<Button
							type="submit"
							disabled={model.pending || !model.nameChanged}
							title={
								!model.nameChanged
									? "Измените название, чтобы сохранить"
									: undefined
							}
							aria-label="Сохранить название"
						>
							Сохранить
						</Button>
						<IconButton
							label="Вернуть сохранённые значения"
							icon={<IconRefresh size={16} />}
							onClick={() => model.refresh("name")}
							disabled={model.pending}
						/>
					</FormActions>
				</Form>
			)}
			{section === "general" && <LocationAndMapSettings {...props} />}
			{section === "confirmations" && (
				<Form
					onSubmit={(event) => {
						event.preventDefault();
						void model.save("policy");
					}}
				>
					<h3>Ручные подтверждения</h3>
					<p>
						Включите этапы, которые оператор должен подтверждать вручную.
						Остальные выполняются автоматически.
					</p>
					{model.confirmations.map((item) => (
						<Label
							key={item.key}
							htmlFor={`${id}-${item.key}`}
							className={styles.switchRow}
						>
							<span>{item.label}</span>
							<Switch
								id={`${id}-${item.key}`}
								checked={item.checked}
								onCheckedChange={(checked) =>
									model.updatePolicy(item.key, checked)
								}
								disabled={model.pending}
							/>
						</Label>
					))}
					<p role="status">{model.messages.policy}</p>
					<FormActions>
						<Button
							type="submit"
							disabled={model.pending || !model.policyChanged}
							title={
								!model.policyChanged
									? "Измените настройки подтверждений, чтобы сохранить"
									: undefined
							}
							aria-label="Сохранить подтверждения"
						>
							Сохранить
						</Button>
						<IconButton
							label="Вернуть сохранённые значения"
							icon={<IconRefresh size={16} />}
							onClick={() => model.refresh("policy")}
							disabled={model.pending}
						/>
					</FormActions>
				</Form>
			)}
		</div>
	);
}
