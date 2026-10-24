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
			className={landingStyles["scenario-preview"]}
			aria-label="Иллюстрация складского сценария"
		>
			<div className={landingStyles["scenario-preview-heading"]}>
				<StaticText text="Центральный склад" />
			</div>
			<div className={landingStyles["scenario-map"]} aria-hidden="true">
				{cells.map(({ id, shelf }) => (
					<span
						key={id}
						className={`${landingStyles["scenario-cell"]} ${shelf ? landingStyles["scenario-shelf"] : ""} ${
							scenario.activeCells.includes(id)
								? landingStyles["scenario-cell-active"]
								: ""
						}`}
					/>
				))}
			</div>
			<div className={landingStyles["scenario-location"]}>
				<IconArrowRight size={16} />
				<StaticText text={scenario.location} />
			</div>
			<div className={landingStyles["scenario-steps"]}>
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
