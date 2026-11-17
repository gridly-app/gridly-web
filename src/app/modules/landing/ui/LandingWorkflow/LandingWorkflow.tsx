import { useState } from "react";

import { SegmentedControl } from "@/shared/ui/navigation";
import { StaticText } from "@/shared/ui/visual";
import {
	landingScenarios,
	type LandingScenarioId,
	scenarioOptions,
} from "../../config/landingScenarios";
import { ScenarioPreview } from "../ScenarioPreview/ScenarioPreview";

import landingStyles from "./LandingWorkflow.module.css";

export function LandingWorkflow() {
	const [selectedId, setSelectedId] = useState<LandingScenarioId>("inbound");
	const selected = landingScenarios[selectedId];

	function handleScenarioChange(id: LandingScenarioId) {
		setSelectedId(id);
	}

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
							value={selectedId}
							onValueChange={handleScenarioChange}
							items={scenarioOptions}
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
				<ScenarioPreview scenarioId={selectedId} />
			</div>
		</section>
	);
}
