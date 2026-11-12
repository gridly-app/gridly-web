import { useSession } from "@/shared/auth";
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
import { useAuthenticate } from "../model/useAuthenticate";
import authStyles from "./AuthPage.module.css";
import { CredentialsForm } from "./CredentialsForm";

export function AuthPage() {
	const model = useAuthenticate();

	const session = useSession();
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
						<CardTitle className={authStyles.title}>{model.title}</CardTitle>
						<CardDescription>{model.description}</CardDescription>
					</CardHeader>
					<CardPanel className={authStyles.body}>
						<CredentialsForm
							model={model}
							error={model.error || session.error}
						/>
					</CardPanel>
					<CardFooter className={authStyles.footer}>
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
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
