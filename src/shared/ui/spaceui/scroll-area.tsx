"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { clsx } from "clsx";
import type React from "react";

import css from "./scroll-area.module.css";

export function ScrollArea({
	className,
	children,
	scrollFade = false,
	scrollbarGutter = false,
	showScrollbar = true,
	fill = false,
	clampContentMinWidth = true,
	overscrollContain = false,
	...props
}: ScrollAreaPrimitive.Root.Props & {
	scrollFade?: boolean;
	scrollbarGutter?: boolean;
	showScrollbar?: boolean;
	fill?: boolean;
	clampContentMinWidth?: boolean;
	overscrollContain?: boolean;
}): React.ReactElement {
	return (
		<ScrollAreaPrimitive.Root className={clsx(css.root, className)} {...props}>
			<ScrollAreaPrimitive.Viewport
				className={clsx(
					css.viewport,
					overscrollContain && css.viewportOverscrollContain,
					scrollFade && css.viewportScrollFade,
					scrollbarGutter && css.viewportScrollbarGutter,
				)}
				data-slot="scroll-area-viewport"
			>
				<ScrollAreaPrimitive.Content
					className={clsx(fill && css.contentFill)}
					data-slot="scroll-area-content"
					style={clampContentMinWidth ? { minWidth: 0 } : undefined}
				>
					{children}
				</ScrollAreaPrimitive.Content>
			</ScrollAreaPrimitive.Viewport>
			{showScrollbar && (
				<>
					<ScrollBar orientation="vertical" />
					<ScrollBar orientation="horizontal" />
				</>
			)}
			<ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
		</ScrollAreaPrimitive.Root>
	);
}

export function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: ScrollAreaPrimitive.Scrollbar.Props): React.ReactElement {
	return (
		<ScrollAreaPrimitive.Scrollbar
			className={clsx(css.scrollbar, className)}
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			{...props}
		>
			<ScrollAreaPrimitive.Thumb
				className={css.thumb}
				data-slot="scroll-area-thumb"
			/>
		</ScrollAreaPrimitive.Scrollbar>
	);
}
