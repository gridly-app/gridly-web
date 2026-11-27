import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

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

import { credentialsFormRules } from "./model/credentialsForm";
import { signInDestination } from "./model/signInDestination";
import { useAuthenticate } from "./model/useAuthenticate";
import { CredentialsForm } from "./ui/CredentialsForm/CredentialsForm";

import styles from "./SignIn.module.css";

const modes = {
	login: {
		title: "Войти в пространство",
		description: "Войдите, чтобы продолжить.",
		prompt: "Нет аккаунта?",
		switchLabel: "Зарегистрироваться",
		submitLabel: "Войти",
	},
	register: {
		title: "Создать аккаунт",
		description: "Создайте своё рабочее пространство.",
		prompt: "Уже есть аккаунт?",
		switchLabel: "Войти",
		submitLabel: "Зарегистрироваться",
	},
};

export function SignIn({ isExtendedLogin }: { isExtendedLogin: boolean }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const { state } = useLocation();
	const mode = searchParams.get("mode") === "register" ? "register" : "login";
	const destination = signInDestination(state);

	function handleModeChange() {
		setSearchParams(
			(current) => {
				const next = new URLSearchParams(current);

				if (mode === "register") {
					next.delete("mode");

					return next;
				}

				next.set("mode", "register");

				return next;
			},
			{ state },
		);
	}

	return (
		<SignInScreen
			key={mode}
			mode={mode}
			destination={destination}
			isExtendedLogin={isExtendedLogin}
			onModeChange={handleModeChange}
		/>
	);
}

function SignInScreen({
	mode,
	destination,
	isExtendedLogin,
	onModeChange,
}: {
	mode: AuthMode;
	destination: string;
	isExtendedLogin: boolean;
	onModeChange: () => void;
}) {
	const session = useSession();
	const model = useAuthenticate(mode, session.authenticate);
	const navigate = useNavigate();
	const copy = modes[mode];
	const error = model.error || session.error;
	const rules = credentialsFormRules(mode, isExtendedLogin);

	async function handleAuthenticate(credentials: Credentials) {
		const authenticated = await model.submit(credentials);

		if (authenticated) void navigate(destination, { replace: true });
	}

	return (
		<div className={`public-page ${styles.auth}`} data-fixed-theme="light">
			<ShapeBackdrop className={styles.backdrop} />
			<Link className={styles.authBack} to="/">
				На главную
			</Link>
			<div className={styles.authForm}>
				<Link className={styles.authBrand} to="/" aria-label="Gridly — главная">
					Gridly
				</Link>
				<Card className={styles.card}>
					<CardHeader className={styles.header}>
						<CardTitle className={styles.title}>{copy.title}</CardTitle>
						<CardDescription>{copy.description}</CardDescription>
					</CardHeader>
					<CardPanel className={styles.body}>
						<CredentialsForm
							rules={rules}
							actionLabel={copy.submitLabel}
							isPending={model.isPending}
							error={error}
							onSubmit={handleAuthenticate}
							onClearError={model.clearError}
						/>
					</CardPanel>
					<CardFooter className={styles.footer}>
						<div className={styles.modeSwitch}>
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
