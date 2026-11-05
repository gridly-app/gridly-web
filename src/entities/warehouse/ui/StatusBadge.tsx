import { type BadgeTone, StatusBadge as ProductStatusBadge } from "@/shared/ui";
import { statuses } from "./warehousePresentation";

const active = new Set([
	"active",
	"running",
	"in_progress",
	"moving",
	"working",
	"carrying",
]);

const warning = new Set([
	"waiting",
	"waiting_confirmation",
	"awaiting_load",
	"charging",
]);

const danger = new Set([
	"blocked",
	"expired",
	"unavailable",
	"received_with_losses",
]);

const neutral = new Set([
	"draft",
	"neutral",
	"cancelled",
	"canceled",
	"idle",
	"created",
	"Архив",
]);
const success = new Set([
	"received",
	"shipped",
	"completed",
	"available",
	"ready",
	"Годно",
]);

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
					: success.has(value)
						? "success"
						: "neutral";
	const indicator =
		tone === "accent"
			? "info"
			: tone === "warning"
				? "warning"
				: tone === "danger"
					? "error"
					: tone === "neutral"
						? "offline"
						: "online";
	return (
		<ProductStatusBadge
			compact
			animated={false}
			status={indicator}
			tone={tone}
			primaryText={statuses[value] || value}
		/>
	);
}
