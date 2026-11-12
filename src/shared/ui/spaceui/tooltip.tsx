"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { clsx } from "clsx";
import type React from "react";

import css from "./tooltip.module.css";

export const TooltipProvider: typeof TooltipPrimitive.Provider =
	TooltipPrimitive.Provider;

export const Tooltip: typeof TooltipPrimitive.Root = TooltipPrimitive.Root;

export function TooltipTrigger(
	props: TooltipPrimitive.Trigger.Props,
): React.ReactElement {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipPopup({
	className,
	align = "center",
	sideOffset = 4,
	side = "top",
	anchor,
	children,
	portalProps,
	...props
}: TooltipPrimitive.Popup.Props & {
	align?: TooltipPrimitive.Positioner.Props["align"];
	side?: TooltipPrimitive.Positioner.Props["side"];
	sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
	anchor?: TooltipPrimitive.Positioner.Props["anchor"];
	portalProps?: TooltipPrimitive.Portal.Props;
}): React.ReactElement {
	return (
		<TooltipPrimitive.Portal {...portalProps}>
			<TooltipPrimitive.Positioner
				align={align}
				anchor={anchor}
				className={css.positioner}
				data-slot="tooltip-positioner"
				side={side}
				sideOffset={sideOffset}
			>
				<TooltipPrimitive.Popup
					className={clsx(css.popup, className)}
					data-slot="tooltip-popup"
					{...props}
				>
					<TooltipPrimitive.Viewport
						className={css.viewport}
						data-slot="tooltip-viewport"
					>
						{children}
					</TooltipPrimitive.Viewport>
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}
export { TooltipPrimitive };
