import { useNavigate, useSearchParams } from "react-router-dom";
import { type AuthMode, type Credentials, useSession } from "@/ports/session";
import { Button } from "@/shared/ui/controls";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";
import { ShapeBackdrop } from "@/shared/ui/visual";
import { useAuthenticate } from "./model/useAuthenticate";
import { CredentialsForm } from "./ui/CredentialsForm/CredentialsForm";

import authStyles from "./SignIn.module.css";

const modes = {
	login: {
		title: "Войти в пространство",
		description: "Войдите, чтобы продолжить.",
		prompt: "Нет аккаунта?",
		switchLabel: "Зарегистрироваться",
	},
	register: {
		title: "Создать аккаунт",
		description: "Создайте своё рабочее пространство.",
		prompt: "Уже есть аккаунт?",
		switchLabel: "Войти",
	},
};

export function SignIn() {
	const [searchParams, setSearchParams] = useSearchParams();
	const mode = searchParams.get("mode") === "register" ? "register" : "login";

	function handleModeChange() {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);

			if (mode === "register") {
				next.delete("mode");

				return next;
			}

			next.set("mode", "register");

			return next;
		});
	}

	return (
		<SignInScreen key={mode} mode={mode} onModeChange={handleModeChange} />
	);
}

function SignInScreen({
	mode,
	onModeChange,
}: {
	mode: AuthMode;
	onModeChange: () => void;
}) {
	const model = useAuthenticate(mode);
	const session = useSession();
	const navigate = useNavigate();
	const copy = modes[mode];
	const error = model.error || session.error;
	const isRegistration = mode === "register";

	async function handleAuthenticate(credentials: Credentials) {
		const authenticated = await model.submit(credentials);

		if (authenticated) void navigate("/app", { replace: true });
	}

	return (
		<div className={`public-page ${authStyles.auth}`} data-fixed-theme="light">
			<ShapeBackdrop className={authStyles.backdrop} />
			<Link className={authStyles.authBack} to="/">
				На главную
			</Link>
			<div className={authStyles.authForm}>
				<Link
					className={authStyles.authBrand}
					to="/"
					aria-label="Gridly — главная"
				>
					Gridly
				</Link>
				<Card className={authStyles.card}>
					<CardHeader className={authStyles.header}>
						<CardTitle className={authStyles.title}>{copy.title}</CardTitle>
						<CardDescription>{copy.description}</CardDescription>
					</CardHeader>
					<CardPanel className={authStyles.body}>
						<CredentialsForm
							isRegistration={isRegistration}
							isPending={model.isPending}
							error={error}
							onSubmit={handleAuthenticate}
							onClearError={model.clearError}
						/>
					</CardPanel>
					<CardFooter className={authStyles.footer}>
						<div className={authStyles.modeSwitch}>
							<span>{copy.prompt}</span>
							<Button
								variant="text"
								onClick={onModeChange}
								disabled={model.isPending}
							>
								{copy.switchLabel}
							</Button>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
