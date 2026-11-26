import { type StatusTone, statusLabels, statusTone } from "@/domain/warehouse";
import { StatusBadge as ProductStatusBadge } from "@/shared/ui/dataDisplay";

const indicators = {
	accent: "info",
	warning: "warning",
	danger: "error",
	neutral: "offline",
	success: "online",
} as const satisfies Record<StatusTone, string>;

export interface StatusBadgeProps {
	value: string;
}

export function StatusBadge({ value }: StatusBadgeProps) {
	const tone = statusTone(value);

	return (
		<ProductStatusBadge
			compact
			animated={false}
			status={indicators[tone]}
			tone={tone}
			primaryText={statusLabels[value] || value}
		/>
	);
}
