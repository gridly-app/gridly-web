import { Button, StaticText } from "@/shared/ui";
import { useLandingScenario } from "../model/useLandingScenario";
import landingStyles from "./LandingPage.module.css";
import { ScenarioPreview } from "./ScenarioPreview";

export function LandingWorkflow() {
	const { scenarios, selected, selectScenario } = useLandingScenario();

	return (
		<section id="workflow" className={landingStyles.landingWorkflow}>
			<div className={landingStyles.workflowHeading}>
				<h2>
					<StaticText text="Весь путь товара." />
					<br />
					<StaticText
						className={landingStyles.workflowHeadingMuted}
						text="В одном пространстве."
					/>
				</h2>
			</div>
			<div className={landingStyles.workflowBody}>
				<div className={landingStyles.workflowCopy}>
					<section
						className={landingStyles.scenarioControls}
						aria-label="Складские сценарии"
					>
						{scenarios.map((scenario) => (
							<Button
								className={landingStyles.scenarioButton}
								key={scenario.id}
								variant="ghost"
								aria-pressed={selected.id === scenario.id}
								onClick={() => selectScenario(scenario.id)}
							>
								<StaticText text={scenario.label} />
							</Button>
						))}
					</section>
					<div
						className={landingStyles.scenarioDescription}
						aria-live="polite"
						aria-atomic="true"
					>
						<h3>
							<StaticText text={selected.title} />
						</h3>
						<p>
							<StaticText text={selected.description} />
						</p>
					</div>
				</div>
				<ScenarioPreview scenario={selected} />
			</div>
		</section>
	);
}
