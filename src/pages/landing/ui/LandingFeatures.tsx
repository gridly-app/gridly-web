import { IconBox, IconMap2, IconRobot } from "@tabler/icons-react";
import { StaticText } from "@/shared/ui";
import landingStyles from "./LandingPage.module.css";

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
		<section id="platform" className={landingStyles["landing-features"]}>
			<div className={landingStyles["section-intro"]}>
				<h2>
					<StaticText text="Порядок, который" />
					<br />
					<StaticText text="чувствуется в работе." />
				</h2>
			</div>
			<div className={landingStyles["feature-grid"]}>
				{features.map(({ id, icon: Icon, title, text }) => (
					<article key={id}>
						<div className={landingStyles["feature-top"]}>
							<Icon size={28} stroke={1.5} />
						</div>
						<h3>
							<StaticText text={title} />
						</h3>
						<p>
							<StaticText text={text} />
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
