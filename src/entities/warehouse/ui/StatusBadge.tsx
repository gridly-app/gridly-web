import { Badge, type BadgeTone } from "@/shared/ui";
import { statuses } from "./warehousePresentation";

const active = new Set([
	"running",
	"in_progress",
	"moving",
	"working",
	"carrying",
]);
const warning = new Set(["waiting", "waiting_confirmation", "awaiting_load"]);
const danger = new Set([
	"blocked",
	"expired",
	"unavailable",
	"received_with_losses",
]);
const neutral = new Set(["draft", "neutral", "cancelled", "idle"]);
export interface StatusBadgeProps {
	value: string;
}
export function StatusBadge({ value }: StatusBadgeProps) {
	const tone: BadgeTone = active.has(value)
		? "accent"
		: warning.has(value)
			? "warning"
			: danger.has(value)
				? "danger"
				: neutral.has(value)
					? "neutral"
					: "success";
	return <Badge tone={tone}>{statuses[value] || value}</Badge>;
}
