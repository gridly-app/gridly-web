import { Link } from "@/shared/ui/navigation";
import { StaticText } from "@/shared/ui/visual";

import landingStyles from "./Landing.module.css";

import { LandingFeatures } from "./ui/LandingFeatures/LandingFeatures";
import { LandingHero } from "./ui/LandingHero/LandingHero";
import { LandingSandbox } from "./ui/LandingSandbox/LandingSandbox";
import { LandingWorkflow } from "./ui/workflow/LandingWorkflow/LandingWorkflow";

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
