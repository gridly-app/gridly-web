import { Navigate } from "react-router-dom";
import { useSession } from "@/shared/auth";
import { Button, Feedback, Link, StaticText } from "@/shared/ui";
import { useLandingPage } from "../model/useLandingPage";
import { LandingFeatures } from "./LandingFeatures";
import { LandingHero } from "./LandingHero";
import landingStyles from "./LandingPage.module.css";
import { LandingSandbox } from "./LandingSandbox";
import { LandingWorkflow } from "./LandingWorkflow";

function WorkspaceEntry() {
	const model = useLandingPage();

	if (model.pending) {
		return <Feedback tone="loading">Загружаем склады…</Feedback>;
	}
	if (model.error) {
		return (
			<Feedback tone="error" role="alert">
				{model.error.message}
				<Button onClick={model.retry}>Повторить</Button>
			</Feedback>
		);
	}

	return <Navigate replace to={model.target} />;
}

export function LandingPage() {
	const { user } = useSession();

	if (user) {
		return <WorkspaceEntry />;
	}

	return (
		<div className={landingStyles.landing} data-palette="warm">
			<main>
				<LandingHero />
				<LandingFeatures />
				<LandingWorkflow />
				<LandingSandbox />
			</main>
			<footer className={landingStyles["landing-footer"]}>
				<Link className={landingStyles["landing-wordmark"]} href="#">
					<StaticText text="gridly." />
				</Link>
				<span>
					<StaticText text={`© ${new Date().getFullYear()} Gridly`} />
				</span>
			</footer>
		</div>
	);
}
