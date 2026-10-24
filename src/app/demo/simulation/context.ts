import { id } from "@/shared/lib";

export interface SimulationContext {
	now(): Date;
	nextId(): string;
}
export const systemContext: SimulationContext = {
	now: () => new Date(),
	nextId: id,
};
export function scenarioDate(date: Date, timezone: string) {
	return date.toLocaleDateString("sv-SE", { timeZone: timezone });
}
