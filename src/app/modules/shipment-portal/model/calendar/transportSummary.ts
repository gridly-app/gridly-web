import { type Actual, transports } from "@/domain/shipment";

export function transportSummary(facts: Actual[]) {
	const names = new Set(facts.map((fact) => transports[fact.transport_type]));

	return [...names].join(", ") || "—";
}
