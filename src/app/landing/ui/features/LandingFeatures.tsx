import { IconBox, IconMap2, IconRobot } from "@tabler/icons-react";
import { StaticText } from "@/shared/ui/visual";
import landingStyles from "./LandingFeatures.module.css";

const features = [
	{
		id: "map",
		icon: IconMap2,
		title: "Видеть целиком.",
		text: "Интерактивная карта склада. Ячейки, зоны и маршруты с понятной картиной происходящего.",
	},
	{
		id: "goods",
		icon: IconBox,
		title: "Знать, где что.",
		text: "Каталог и остатки рядом с приёмкой и отгрузкой. Каждое движение остаётся в истории.",
	},
	{
		id: "robots",
		icon: IconRobot,
		title: "Двигаться точнее.",
		text: "Роботы, задачи и статусы в одном окне. Контроль процесса от запуска до завершения.",
	},
];

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
				{features.map(({ id, icon: Icon, title, text }) => (
					<article key={id} className={landingStyles.featureCard}>
						<span className={landingStyles.featureIcon}>
							<Icon aria-hidden="true" size={24} stroke={1.6} />
						</span>
						<h3>{title}</h3>
						<p>{text}</p>
					</article>
				))}
			</div>
		</section>
	);
}
