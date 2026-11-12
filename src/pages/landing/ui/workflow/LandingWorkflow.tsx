import { SegmentedControl } from "@/shared/ui/navigation";
import { StaticText } from "@/shared/ui/visual";
import { useLandingScenario } from "../../model/useLandingScenario";
import landingStyles from "./LandingWorkflow.module.css";
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
				<div>
					<div className={landingStyles.scenarioControls}>
						<SegmentedControl
							aria-label="Складские сценарии"
							value={selected.id}
							onValueChange={selectScenario}
							items={scenarios.map((scenario) => ({
								value: scenario.id,
								label: scenario.label,
							}))}
						/>
					</div>
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
