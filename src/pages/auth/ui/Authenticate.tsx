import { IconCheck, IconCircle } from "@tabler/icons-react";
import { useId } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useSession } from "@/shared/auth";
import {
	Button,
	Checkbox,
	CheckLabel,
	Feedback,
	Field,
	Form,
	Input,
	Link,
	ShapeBackdrop,
	SignInBlock,
} from "@/shared/ui";
import { useAuthenticate } from "../model/useAuthenticate";
import authStyles from "./Authenticate.module.css";

export function Authenticate() {
	const controlId = useId();
	const model = useAuthenticate();

	const session = useSession();
	return (
		<div className={`public-page ${authStyles.auth}`} data-fixed-theme="light">
			<ShapeBackdrop className={authStyles.backdrop} />
			<Link className={authStyles.authBack} render={<RouterLink to="/" />}>
				На главную
			</Link>
			<div className={authStyles.authForm}>
				<Link
					className={authStyles.authBrand}
					render={<RouterLink to="/" />}
					aria-label="Gridly — главная"
				>
					Gridly
				</Link>
				<SignInBlock
					title={model.title}
					description={model.description}
					footer={
						<div className={authStyles.modeSwitch}>
							<span>{model.modePrompt}</span>
							<Button
								variant="text"
								onClick={model.toggleMode}
								disabled={model.pending}
							>
								{model.modeLabel}
							</Button>
						</div>
					}
				>
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
						{(model.error || session.error) && (
							<Feedback role="alert" tone="error">
								{model.error || session.error}
							</Feedback>
						)}
						<Button type="submit" fullWidth size="lg" loading={model.pending}>
							{model.submitLabel}
						</Button>
					</Form>
				</SignInBlock>
			</div>
		</div>
	);
}
