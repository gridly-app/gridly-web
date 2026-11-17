import { IconArrowRight, IconCheck } from "@tabler/icons-react";

import {
	landingScenarios,
	type LandingScenarioId,
} from "../../config/landingScenarios";
import { ScenarioMap } from "../ScenarioMap/ScenarioMap";

import styles from "./ScenarioPreview.module.css";

export function ScenarioPreview({
	scenarioId,
}: {
	scenarioId: LandingScenarioId;
}) {
	const { location, steps } = landingScenarios[scenarioId];

	return (
		<section
			className={styles.scenarioPreview}
			aria-label="Иллюстрация складского сценария"
		>
			<div className={styles.scenarioPreviewHeading}>
				<span>Центральный склад</span>
				<span className={styles.previewStatus}>Пример сценария</span>
			</div>
			<ScenarioMap scenarioId={scenarioId} />
			<div className={styles.scenarioLocation}>
				<IconArrowRight size={16} />
				<span>{location}</span>
			</div>
			<div className={styles.scenarioSteps}>
				{steps.map((step) => (
					<div key={step}>
						<IconCheck size={16} />
						<span>{step}</span>
					</div>
				))}
			</div>
		</section>
	);
}
