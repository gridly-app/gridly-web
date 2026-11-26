import { IconRefresh } from "@tabler/icons-react";
import { type FormEvent, useId } from "react";
import type { WorkflowKey } from "@/domain/warehouse";
import { Button, IconButton, Switch } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Form, FormActions, Label } from "@/shared/ui/forms";
import type { SettingsCommandOptions } from "../../model/useNameSettings";
import { usePolicySettings } from "../../model/usePolicySettings";
import styles from "../../shared.module.css";

export function ConfirmationSettings(options: SettingsCommandOptions) {
	const id = useId();
	const model = usePolicySettings(options);
	const saveHint = model.isChanged
		? undefined
		: "Измените настройки подтверждений, чтобы сохранить";

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void model.save();
	}

	return (
		<section className={styles.card}>
			<Form onSubmit={handleSubmit}>
				<h3>Ручные подтверждения</h3>
				{model.confirmations.map((item) => (
					<ConfirmationSwitch
						key={item.key}
						id={`${id}-${item.key}`}
						item={item}
						disabled={model.isBusy}
						onChange={model.updatePolicy}
					/>
				))}
				{model.message && (
					<Feedback tone={model.message.tone}>{model.message.text}</Feedback>
				)}
				<FormActions>
					<Button
						type="submit"
						disabled={model.isBusy || !model.isChanged}
						title={saveHint}
						aria-label="Сохранить подтверждения"
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
		</section>
	);
}

function ConfirmationSwitch({
	id,
	item,
	disabled,
	onChange,
}: {
	id: string;
	item: { key: WorkflowKey; label: string; checked: boolean };
	disabled: boolean;
	onChange: (key: WorkflowKey, checked: boolean) => void;
}) {
	function handleCheckedChange(checked: boolean) {
		onChange(item.key, checked);
	}

	return (
		<Label htmlFor={id} className={styles.switchRow}>
			<span>{item.label}</span>
			<Switch
				id={id}
				checked={item.checked}
				onCheckedChange={handleCheckedChange}
				disabled={disabled}
			/>
		</Label>
	);
}
