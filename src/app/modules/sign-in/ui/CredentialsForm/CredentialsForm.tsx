import { type ChangeEvent, type SubmitEvent, useState } from "react";

import type { Credentials } from "@/ports/session";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Form } from "@/shared/ui/forms";

import {
	type CredentialsFormRules,
	readCredentials,
} from "../../model/credentialsForm";
import { PasswordFields } from "../PasswordFields/PasswordFields";

interface CredentialsFormProps {
	rules: CredentialsFormRules;
	actionLabel: string;
	isPending: boolean;
	error: string;
	onSubmit: (credentials: Credentials) => Promise<void>;
	onClearError: () => void;
}

export function CredentialsForm({
	rules,
	actionLabel,
	isPending,
	error,
	onSubmit,
	onClearError,
}: CredentialsFormProps) {
	const [validationError, setValidationError] = useState("");
	const submitLabel = isPending ? "Подождите…" : actionLabel;
	const displayedError = validationError || error;

	function handleChange(event: ChangeEvent<HTMLFormElement>) {
		if (
			!(event.target instanceof HTMLInputElement) ||
			event.target.type === "checkbox"
		)
			return;

		const confirmation = event.currentTarget.elements.namedItem(
			"passwordConfirmation",
		);

		setValidationError("");
		onClearError();

		if (confirmation instanceof HTMLInputElement)
			confirmation.setCustomValidity("");
	}

	function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isPending) return;

		const form = event.currentTarget;
		const result = readCredentials(new FormData(form), rules);

		if (!result.ok) {
			setValidationError(result.message);

			const confirmation = form.elements.namedItem(result.field);

			if (
				result.field === "passwordConfirmation" &&
				confirmation instanceof HTMLInputElement
			) {
				confirmation.setCustomValidity("Пароли не совпадают");
				confirmation.reportValidity();
				confirmation.focus();
			}

			return;
		}

		setValidationError("");
		void onSubmit(result.credentials);
	}

	return (
		<Form onChange={handleChange} onSubmit={handleSubmit}>
			<Field label="Логин">
				<Input
					name="login"
					required
					minLength={rules.loginMinLength}
					maxLength={rules.loginMaxLength}
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					disabled={isPending}
				/>
			</Field>
			<PasswordFields
				minLength={rules.registration?.passwordMinLength}
				isPending={isPending}
			/>
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
