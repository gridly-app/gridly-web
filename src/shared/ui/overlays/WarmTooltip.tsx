import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import {
	Tooltip,
	TooltipPopup,
	TooltipPrimitive,
	TooltipProvider,
} from "../spaceui/tooltip";
import tooltipStyles from "./WarmTooltip.module.css";

export interface WarmTooltipProps {
	content: ReactNode;
	children: ReactElement;
	side?: ("top" | "bottom" | "left" | "right") | undefined;
	disabled?: boolean | undefined;
	focusable?: boolean | undefined;
}

export function WarmTooltipGroup({ children }: PropsWithChildren) {
	return (
		<TooltipProvider delay={400} timeout={300}>
			{children}
		</TooltipProvider>
	);
}

export function WarmTooltip({
	content,
	children,
	side = "top",
	disabled,
	focusable,
}: WarmTooltipProps) {
	if (!content) {
		return children;
	}

	return (
		<Tooltip disabled={disabled} disableHoverablePopup={false}>
			<TooltipPrimitive.Trigger
				render={children}
				{...(focusable ? { tabIndex: 0 } : {})}
			/>
			<TooltipPopup
				data-warm-tooltip=""
				side={side}
				sideOffset={8}
				className={tooltipStyles.warmTooltipPopup}
			>
				{content}
			</TooltipPopup>
		</Tooltip>
	);
}
