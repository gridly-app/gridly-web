import { Link } from "@/shared/ui/navigation";
import { StaticText } from "@/shared/ui/visual";
import landingStyles from "./Landing.module.css";
import { LandingFeatures } from "./ui/features/LandingFeatures";
import { LandingHero } from "./ui/hero/LandingHero";
import { LandingSandbox } from "./ui/sandbox/LandingSandbox";
import { LandingWorkflow } from "./ui/workflow/LandingWorkflow";

export function Landing() {
	return (
		<div
			className={`public-page ${landingStyles.landing}`}
			data-fixed-theme="light"
		>
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
