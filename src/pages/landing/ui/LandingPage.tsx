import { AnimatedContent, Link, StaticText } from "@/shared/ui";
import { LandingFeatures } from "./LandingFeatures";
import { LandingHero } from "./LandingHero";
import landingStyles from "./LandingPage.module.css";
import { LandingSandbox } from "./LandingSandbox";
import { LandingWorkflow } from "./LandingWorkflow";

export function LandingPage() {
	return (
		<div
			className={`public-page ${landingStyles.landing}`}
			data-fixed-theme="light"
		>
			<main>
				<LandingHero />
				<AnimatedContent>
					<LandingFeatures />
				</AnimatedContent>
				<AnimatedContent>
					<LandingWorkflow />
				</AnimatedContent>
				<AnimatedContent>
					<LandingSandbox />
				</AnimatedContent>
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
