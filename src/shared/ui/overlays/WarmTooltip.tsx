import { Tooltip } from "@base-ui/react/tooltip";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import tooltipStyles from "./WarmTooltip.module.css";

export interface WarmTooltipProps {
	content: ReactNode;
	children: ReactElement;
	side?: "top" | "bottom" | "left" | "right";
	disabled?: boolean;
}

export function WarmTooltipGroup({ children }: PropsWithChildren) {
	return (
		<Tooltip.Provider delay={400} timeout={300}>
			{children}
		</Tooltip.Provider>
	);
}

export function WarmTooltip({
	content,
	children,
	side = "top",
	disabled,
}: WarmTooltipProps) {
	if (disabled || !content) {
		return children;
	}

	return (
		<Tooltip.Root>
			<Tooltip.Trigger render={children} />
			<Tooltip.Portal>
				<Tooltip.Positioner
					side={side}
					sideOffset={8}
					className={tooltipStyles["warm-tooltip-positioner"]}
				>
					<Tooltip.Popup
						className={tooltipStyles["warm-tooltip-popup"]}
						role="tooltip"
					>
						{content}
						<Tooltip.Arrow className={tooltipStyles["warm-tooltip-arrow"]} />
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}
