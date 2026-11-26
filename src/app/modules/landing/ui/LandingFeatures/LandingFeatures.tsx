import { StaticText } from "@/shared/ui/visual";

import { landingFeatures } from "../../config/landingFeatures";

import landingStyles from "./LandingFeatures.module.css";

export function LandingFeatures() {
	return (
		<section id="platform" className={landingStyles.landingFeatures}>
			<div className={landingStyles.sectionIntro}>
				<h2>
					<StaticText text="Порядок, который" />
					<br />
					<StaticText text="чувствуется в работе." />
				</h2>
			</div>
			<div className={landingStyles.featureGrid}>
				{landingFeatures.map(({ id, icon: Icon, title, text }) => (
					<article key={id} className={landingStyles.featureCard}>
						<span className={landingStyles.featureIcon}>
							<Icon aria-hidden="true" size={24} stroke={1.6} />
						</span>
						<h3 className={landingStyles.cardTitle}>{title}</h3>
						<p className={landingStyles.cardDescription}>{text}</p>
					</article>
				))}
			</div>
		</section>
	);
}
