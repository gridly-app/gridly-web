import { Link } from "@/shared/ui/navigation";
import { AnimatedContent, StaticText } from "@/shared/ui/visual";
import { LandingFeatures } from "./features/LandingFeatures";
import { LandingHero } from "./hero/LandingHero";
import landingStyles from "./LandingPage.module.css";
import { LandingSandbox } from "./sandbox/LandingSandbox";
import { LandingWorkflow } from "./workflow/LandingWorkflow";

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
