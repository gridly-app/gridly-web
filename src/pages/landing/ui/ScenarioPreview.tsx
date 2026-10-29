import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { StaticText } from "@/shared/ui";
import type { LandingScenario } from "../config/landingScenarios";
import landingStyles from "./LandingPage.module.css";

export interface ScenarioPreviewProps {
	scenario: LandingScenario;
}

const cells = Array.from({ length: 48 }, (_, id) => ({
	id,
	shelf:
		[1, 2, 3, 4].includes(id % 8) && [1, 2, 4, 5].includes(Math.floor(id / 8)),
}));

export function ScenarioPreview({ scenario }: ScenarioPreviewProps) {
	return (
		<section
			className={landingStyles.scenarioPreview}
			aria-label="Иллюстрация складского сценария"
		>
			<div className={landingStyles.scenarioPreviewHeading}>
				<StaticText text="Центральный склад" />
			</div>
			<div className={landingStyles.scenarioMap} aria-hidden="true">
				{cells.map(({ id, shelf }) => (
					<span
						key={id}
						className={`${landingStyles.scenarioCell} ${shelf ? landingStyles.scenarioShelf : ""} ${
							scenario.activeCells.includes(id)
								? landingStyles.scenarioCellActive
								: ""
						}`}
					/>
				))}
			</div>
			<div className={landingStyles.scenarioLocation}>
				<IconArrowRight size={16} />
				<StaticText text={scenario.location} />
			</div>
			<div className={landingStyles.scenarioSteps}>
				{scenario.steps.map((step) => (
					<div key={step}>
						<span>
							<IconCheck size={12} />
						</span>
						<StaticText text={step} />
					</div>
				))}
			</div>
		</section>
	);
}
