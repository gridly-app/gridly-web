import { IconCheck, IconCircle } from "@tabler/icons-react";
import { type ChangeEvent, useId, useState } from "react";

import { Checkbox, Input } from "@/shared/ui/controls";
import { CheckLabel, Field } from "@/shared/ui/forms";

import styles from "./PasswordFields.module.css";

export function PasswordFields({
	minLength,
	isPending,
}: {
	minLength: number | undefined;
	isPending: boolean;
}) {
	const controlId = useId();
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [values, setValues] = useState({ password: "", confirmation: "" });
	const passwordType = isPasswordVisible ? "text" : "password";
	const isRegistration = minLength !== undefined;
	const autoComplete = isRegistration ? "new-password" : "current-password";
	const passwordHintId = `${controlId}-password-hint`;
	const confirmationHintId = `${controlId}-confirmation-hint`;
	const passwordDescription = isRegistration ? passwordHintId : undefined;
	const isPasswordLongEnough =
		isRegistration && values.password.length >= minLength;
	const doPasswordsMatch =
		values.confirmation.length > 0 && values.password === values.confirmation;
	const matchLabel = doPasswordsMatch
		? "Пароли совпадают"
		: "Пароли должны совпадать";

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const { form } = event.currentTarget;

		if (!form) return;

		const data = new FormData(form);

		setValues({
			password: String(data.get("password") ?? ""),
			confirmation: String(data.get("passwordConfirmation") ?? ""),
		});
	}

	return (
		<>
			<Field label="Пароль">
				<Input
					name="password"
					type={passwordType}
					required
					minLength={minLength}
					autoComplete={autoComplete}
					disabled={isPending}
					aria-describedby={passwordDescription}
					onChange={isRegistration ? handleChange : undefined}
				/>
			</Field>
			{isRegistration && (
				<>
					<PasswordHint
						id={passwordHintId}
						isComplete={isPasswordLongEnough}
						label={`Не менее ${minLength} символов`}
					/>
					<Field label="Подтвердите пароль">
						<Input
							name="passwordConfirmation"
							aria-describedby={confirmationHintId}
							type={passwordType}
							required
							minLength={minLength}
							autoComplete="new-password"
							disabled={isPending}
							onChange={handleChange}
						/>
					</Field>
					<PasswordHint
						id={confirmationHintId}
						isComplete={doPasswordsMatch}
						label={matchLabel}
					/>
				</>
			)}
			<CheckLabel htmlFor={controlId}>
				<Checkbox
					id={controlId}
					checked={isPasswordVisible}
					onCheckedChange={setIsPasswordVisible}
				/>
				Показать пароль
			</CheckLabel>
		</>
	);
}

function PasswordHint({
	id,
	isComplete,
	label,
}: {
	id: string;
	isComplete: boolean;
	label: string;
}) {
	const Icon = isComplete ? IconCheck : IconCircle;

	return (
		<div
			id={id}
			className={styles.passwordHint}
			data-complete={isComplete}
			role="status"
			aria-live="polite"
		>
			<Icon size={16} aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
