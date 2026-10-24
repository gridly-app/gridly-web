import { useState } from "react";
import type { LandingScenarioId } from "../config/landingScenarios";
import { landingScenarios } from "../config/landingScenarios";

export function useLandingScenario() {
	const [selectedId, selectScenario] = useState<LandingScenarioId>("inbound");
	const selected =
		landingScenarios.find((scenario) => scenario.id === selectedId) ||
		landingScenarios[0];

	return { scenarios: landingScenarios, selected, selectScenario };
}
