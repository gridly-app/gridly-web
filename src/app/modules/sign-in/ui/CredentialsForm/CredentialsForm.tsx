import { IconCheck, IconCircle } from "@tabler/icons-react";
import { type ChangeEvent, type SubmitEvent, useId, useState } from "react";
import type { Credentials } from "@/ports/session";
import { formText } from "@/shared/lib";
import {
	loginMaxLength,
	newLoginSchema,
	registrationLoginMaxLength,
} from "@/domain/account";
import { environment } from "@/shared/config";
import { Button, Checkbox, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { CheckLabel, Field, Form } from "@/shared/ui/forms";
import authStyles from "./CredentialsForm.module.css";

interface CredentialsFormProps {
	isRegistration: boolean;
	isPending: boolean;
	error: string;
	onSubmit: (credentials: Credentials) => Promise<void>;
	onClearError: () => void;
}

export function CredentialsForm({
	isRegistration,
	isPending,
	error,
	onSubmit,
	onClearError,
}: CredentialsFormProps) {
	const controlId = useId();
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [passwordValue, setPasswordValue] = useState("");
	const [confirmationValue, setConfirmationValue] = useState("");
	const [validationError, setValidationError] = useState("");
	const isPasswordLongEnough = passwordValue.length >= 8;
	const doPasswordsMatch =
		confirmationValue.length > 0 && passwordValue === confirmationValue;
	const passwordType = isPasswordVisible ? "text" : "password";
	const passwordAutoComplete = isRegistration
		? "new-password"
		: "current-password";
	const actionLabel = isRegistration ? "Зарегистрироваться" : "Войти";
	const submitLabel = isPending ? "Подождите…" : actionLabel;
	const displayedError = validationError || error;
	const loginMinLength = isRegistration ? 3 : 1;
	const extendedRegistration = isRegistration && environment.extendedLogin;
	const loginLimit =
		isRegistration && !extendedRegistration
			? registrationLoginMaxLength
			: loginMaxLength;
	const passwordMinLength = isRegistration ? 8 : undefined;
	const passwordHintId = `${controlId}-password-hint`;
	const confirmationHintId = `${controlId}-confirmation-hint`;
	const passwordDescription = isRegistration ? passwordHintId : undefined;
	const matchLabel = doPasswordsMatch
		? "Пароли совпадают"
		: "Пароли должны совпадать";

	function handleChange(event: ChangeEvent<HTMLFormElement>) {
		if (
			!(event.target instanceof HTMLInputElement) ||
			event.target.type === "checkbox"
		)
			return;

		const form = event.currentTarget;
		const data = new FormData(form);
		const confirmation = form.elements.namedItem("passwordConfirmation");

		setPasswordValue(String(data.get("password") ?? ""));
		setConfirmationValue(String(data.get("passwordConfirmation") ?? ""));
		setValidationError("");
		onClearError();

		if (confirmation instanceof HTMLInputElement)
			confirmation.setCustomValidity("");
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isPending) return;

		const data = new FormData(event.currentTarget);
		const password = data.get("password");

		if (isRegistration && password !== data.get("passwordConfirmation")) {
			const confirmation = event.currentTarget.elements.namedItem(
				"passwordConfirmation",
			);
			setValidationError("Пароли не совпадают. Повторите пароль ещё раз.");

			if (confirmation instanceof HTMLInputElement) {
				confirmation.setCustomValidity("Пароли не совпадают");
				confirmation.reportValidity();
				confirmation.focus();
			}

			return;
		}

		const login = formText(data, "login");

		if (extendedRegistration && !newLoginSchema.safeParse(login).success) {
			setValidationError(
				"Логин должен содержать от 3 до 254 символов. Используйте латиницу, цифры и символы _ . + - @.",
			);
			return;
		}

		setValidationError("");

		const credentials = {
			login,
			password: typeof password === "string" ? password : "",
		};

		void onSubmit(credentials);
	}

	return (
		<Form onChange={handleChange} onSubmit={handleSubmit}>
			<Field label="Логин">
				<Input
					name="login"
					required
					minLength={loginMinLength}
					maxLength={loginLimit}
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					disabled={isPending}
				/>
			</Field>
			<Field label="Пароль">
				<Input
					name="password"
					type={passwordType}
					required
					minLength={passwordMinLength}
					autoComplete={passwordAutoComplete}
					disabled={isPending}
					aria-describedby={passwordDescription}
				/>
			</Field>

			{isRegistration && (
				<>
					<PasswordHint
						id={passwordHintId}
						isComplete={isPasswordLongEnough}
						label="Не менее 8 символов"
					/>
					<Field label="Подтвердите пароль">
						<Input
							name="passwordConfirmation"
							aria-describedby={confirmationHintId}
							type={passwordType}
							required
							minLength={8}
							autoComplete="new-password"
							disabled={isPending}
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
			{displayedError && (
				<Feedback role="alert" tone="error">
					{displayedError}
				</Feedback>
			)}
			<Button type="submit" fullWidth size="lg" loading={isPending}>
				{submitLabel}
			</Button>
		</Form>
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
			className={authStyles.passwordHint}
			data-complete={isComplete}
			role="status"
			aria-live="polite"
		>
			<Icon size={16} aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
