import { IconArrowUpRight, IconPlayerPlay } from "@tabler/icons-react";
import { useId } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	Button,
	Checkbox,
	CheckLabel,
	Feedback,
	Field,
	Form,
	Input,
	Link,
	SignInBlock,
	TileBackdrop,
} from "@/shared/ui";
import { useAuthenticate } from "../model/useAuthenticate";
import authStyles from "./Authenticate.module.css";

export function Authenticate() {
	const controlId = useId();
	const model = useAuthenticate();

	return (
		<div className={authStyles.auth} data-palette="warm">
			<TileBackdrop
				classNames={{
					root: authStyles.backdrop,
					grid: authStyles.backdropGrid,
					fade: authStyles.backdropFade,
				}}
			/>
			<Link className={authStyles["auth-back"]} render={<RouterLink to="/" />}>
				На главную
			</Link>
			<div className={authStyles["auth-form"]}>
				<Link
					className={authStyles["auth-brand"]}
					render={<RouterLink to="/" />}
					aria-label="Gridly — главная"
				>
					Gridly
					<span aria-hidden="true">.</span>
				</Link>
				<SignInBlock
					title={model.title}
					description={model.description}
					footer={
						<Button
							variant="text"
							className={authStyles.modeButton}
							onClick={model.toggleMode}
						>
							{model.modeLabel}
						</Button>
					}
				>
					<Form
						onSubmit={(event) => {
							void model.submit(event);
						}}
					>
						<Field className={authStyles.field} label="Логин">
							<Input
								className={authStyles.input}
								name="login"
								required
								minLength={3}
								maxLength={32}
								autoComplete="username"
							/>
						</Field>
						<Field className={authStyles.field} label="Пароль">
							<Input
								className={authStyles.input}
								name="password"
								type={model.passwordType}
								required
								minLength={8}
								autoComplete={model.passwordAutoComplete}
							/>
						</Field>
						<CheckLabel className={authStyles.check} htmlFor={controlId}>
							<Checkbox
								id={controlId}
								checked={model.show}
								onCheckedChange={model.changePasswordVisibility}
							/>
							Показать пароль
						</CheckLabel>
						{model.error && (
							<Feedback role="alert" tone="error">
								{model.error}
							</Feedback>
						)}
						<Button
							type="submit"
							fullWidth
							size="lg"
							className={authStyles.submit}
							loading={model.pending}
							disabled={model.demoPending}
						>
							{model.submitLabel}
						</Button>
					</Form>
				</SignInBlock>
				<div className={authStyles["auth-demo"]}>
					<Button
						variant="secondary"
						size="lg"
						className={authStyles.demoButton}
						onClick={() => {
							void model.openDemo();
						}}
						loading={model.demoPending}
						disabled={model.pending}
					>
						<IconPlayerPlay size={16} />
						Открыть демо
						<IconArrowUpRight size={16} />
					</Button>
				</div>
			</div>
		</div>
	);
}
