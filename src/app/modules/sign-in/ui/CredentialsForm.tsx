import { IconCheck, IconCircle } from "@tabler/icons-react";
import { useId } from "react";
import { Button, Checkbox, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { CheckLabel, Field, Form } from "@/shared/ui/forms";
import type { useAuthenticate } from "../model/useAuthenticate";
import authStyles from "./CredentialsForm.module.css";

interface CredentialsFormProps {
	model: Pick<
		ReturnType<typeof useAuthenticate>,
		| "register"
		| "clearPasswordError"
		| "submit"
		| "pending"
		| "passwordType"
		| "passwordAutoComplete"
		| "passwordLongEnough"
		| "passwordMatches"
		| "show"
		| "changePasswordVisibility"
		| "submitLabel"
	>;
	error: string;
}

export function CredentialsForm({ model, error }: CredentialsFormProps) {
	const controlId = useId();
	return (
		<Form
			key={model.register ? "register" : "login"}
			onChange={(event) => {
				if (
					event.target instanceof HTMLInputElement &&
					event.target.type !== "checkbox"
				)
					model.clearPasswordError(event.currentTarget);
			}}
			onSubmit={(event) => {
				void model.submit(event);
			}}
		>
			<Field label="Логин">
				<Input
					name="login"
					required
					minLength={3}
					maxLength={32}
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					disabled={model.pending}
				/>
			</Field>
			<Field label="Пароль">
				<Input
					name="password"
					type={model.passwordType}
					required
					minLength={8}
					autoComplete={model.passwordAutoComplete}
					disabled={model.pending}
					aria-describedby={
						model.register ? `${controlId}-password-hint` : undefined
					}
				/>
			</Field>

			{model.register && (
				<>
					<div
						id={`${controlId}-password-hint`}
						className={authStyles.passwordHint}
						data-complete={model.passwordLongEnough}
						role="status"
						aria-live="polite"
					>
						{model.passwordLongEnough ? (
							<IconCheck size={16} />
						) : (
							<IconCircle size={16} />
						)}
						<span>Не менее 8 символов</span>
					</div>
					<Field label="Подтвердите пароль">
						<Input
							name="passwordConfirmation"
							aria-describedby={`${controlId}-confirmation-hint`}
							type={model.passwordType}
							required
							minLength={8}
							autoComplete="new-password"
							disabled={model.pending}
						/>
					</Field>
					<div
						id={`${controlId}-confirmation-hint`}
						className={authStyles.passwordHint}
						data-complete={model.passwordMatches}
						role="status"
						aria-live="polite"
					>
						{model.passwordMatches ? (
							<IconCheck size={16} />
						) : (
							<IconCircle size={16} />
						)}
						<span>
							{model.passwordMatches
								? "Пароли совпадают"
								: "Пароли должны совпадать"}
						</span>
					</div>
				</>
			)}
			<CheckLabel htmlFor={controlId}>
				<Checkbox
					id={controlId}
					checked={model.show}
					onCheckedChange={model.changePasswordVisibility}
				/>
				Показать пароль
			</CheckLabel>
			{error && (
				<Feedback role="alert" tone="error">
					{error}
				</Feedback>
			)}
			<Button type="submit" fullWidth size="lg" loading={model.pending}>
				{model.submitLabel}
			</Button>
		</Form>
	);
}
