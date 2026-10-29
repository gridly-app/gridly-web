import { useState } from "react";
import type { LandingScenarioId } from "../config/landingScenarios";
import { landingScenarios } from "../config/landingScenarios";

export function useLandingScenario() {
	const [selectedId, selectScenario] = useState<LandingScenarioId>("inbound");
	const selected =
		landingScenarios.find((scenario) => scenario.id === selectedId) ||
		landingScenarios.find((scenario) => scenario.id === "inbound");
	if (!selected) throw new Error("Landing scenario is missing");

	return { scenarios: landingScenarios, selected, selectScenario };
}
