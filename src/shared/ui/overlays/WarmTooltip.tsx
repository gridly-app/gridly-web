import { Tooltip } from "@base-ui/react/tooltip";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import tooltipStyles from "./WarmTooltip.module.css";

export interface WarmTooltipProps {
	content: ReactNode;
	children: ReactElement;
	side?: ("top" | "bottom" | "left" | "right") | undefined;
	disabled?: boolean | undefined;
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
					className={tooltipStyles.warmTooltipPositioner}
				>
					<Tooltip.Popup
						className={tooltipStyles.warmTooltipPopup}
						role="tooltip"
					>
						{content}
						<Tooltip.Arrow className={tooltipStyles.warmTooltipArrow} />
					</Tooltip.Popup>
				</Tooltip.Positioner>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}
