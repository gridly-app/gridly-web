import { useId } from "react";
import { Button, Field, Form, Input, Switch } from "@/shared/ui";
import {
	type SettingsFormOptions,
	useSettingsForm,
} from "../model/useSettingsForm";
import styles from "./SettingsPage.module.css";
export function SettingsForm(props: SettingsFormOptions) {
	const id = useId();
	const model = useSettingsForm(props);
	return (
		<div className={styles.settings}>
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
				<Button type="submit" disabled={model.pending || !model.nameChanged}>
					Сохранить название
				</Button>
				<Button onClick={() => model.refresh("name")} disabled={model.pending}>
					Обновить название
				</Button>
			</Form>
			<hr />
			<Form
				onSubmit={(event) => {
					event.preventDefault();
					void model.save("policy");
				}}
			>
				<h3>Ручные подтверждения</h3>
				<p>Эти значения будут использоваться для новых заказов.</p>
				{model.confirmations.map((item) => (
					<label
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
					</label>
				))}
				<p role="status">{model.messages.policy}</p>
				<Button type="submit" disabled={model.pending || !model.policyChanged}>
					Сохранить подтверждения
				</Button>
				<Button
					onClick={() => model.refresh("policy")}
					disabled={model.pending}
				>
					Обновить подтверждения
				</Button>
			</Form>
		</div>
	);
}
