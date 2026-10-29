import { Link, StaticText } from "@/shared/ui";
import { LandingFeatures } from "./LandingFeatures";
import { LandingHero } from "./LandingHero";
import landingStyles from "./LandingPage.module.css";
import { LandingSandbox } from "./LandingSandbox";
import { LandingWorkflow } from "./LandingWorkflow";

export function LandingPage() {
	return (
		<div className={landingStyles.landing} data-palette="warm">
			<main>
				<LandingHero />
				<LandingFeatures />
				<LandingWorkflow />
				<LandingSandbox />
			</main>
			<footer className={landingStyles.landingFooter}>
				<Link className={landingStyles.landingWordmark} href="#">
					<StaticText text="Gridly" />
				</Link>
				<span>
					<StaticText text={`© ${new Date().getFullYear()} Gridly`} />
				</span>
			</footer>
		</div>
	);
}
