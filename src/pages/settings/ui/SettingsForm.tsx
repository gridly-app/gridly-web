import { IconRefresh } from "@tabler/icons-react";
import { useId } from "react";
import { Button, IconButton, Input, Switch } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Form, FormActions, FormGrid, Label } from "@/shared/ui/forms";
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
		<section
			className={
				section === "general" ? `${styles.card} ${styles.general}` : styles.card
			}
		>
			{section === "general" && <h3>Основные параметры</h3>}
			{section === "general" && (
				<Form
					onSubmit={(event) => {
						event.preventDefault();
						void model.save("name");
					}}
				>
					<FormGrid>
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
					</FormGrid>
					{model.messages.name && (
						<Feedback tone={model.messages.name.tone}>
							{model.messages.name.text}
						</Feedback>
					)}
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
					{model.messages.policy && (
						<Feedback tone={model.messages.policy.tone}>
							{model.messages.policy.text}
						</Feedback>
					)}
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
		</section>
	);
}
