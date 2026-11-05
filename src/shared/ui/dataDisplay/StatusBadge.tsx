import type { ReactNode } from "react";
import { StatusBadge as SpaceStatus } from "../spaceui/status-badge";
import type { BadgeTone } from "./Badge";
export type StatusBadgeProps = {
	status: "online" | "offline" | "busy" | "info" | "warning" | "error";
	tone?: BadgeTone;
	compact?: boolean;
	primaryText: string;
	children?: ReactNode | undefined;
	animated?: boolean | undefined;
	compactOnMobile?: boolean | undefined;
};
export function StatusBadge({
	compactOnMobile,
	tone,
	compact,
	animated = true,
	...props
}: StatusBadgeProps) {
	return (
		<SpaceStatus
			{...props}
			animated={animated}
			data-tone={tone}
			mode={compact ? "stack" : "inline"}
			size={compact ? "sm" : "md"}
			secondaryTextClassName={compactOnMobile ? "hidden sm:inline" : ""}
		/>
	);
}
