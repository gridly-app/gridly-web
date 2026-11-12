"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import { XIcon } from "lucide-react";
import type React from "react";
import { Button } from "@/shared/ui/spaceui/button";

import css from "./sheet.module.css";

export const Sheet: typeof SheetPrimitive.Root = SheetPrimitive.Root;

export const SheetPortal: typeof SheetPrimitive.Portal = SheetPrimitive.Portal;

export function SheetBackdrop({
	className,
	...props
}: SheetPrimitive.Backdrop.Props): React.ReactElement {
	return (
		<SheetPrimitive.Backdrop
			className={clsx(css.backdrop, className)}
			data-slot="sheet-backdrop"
			{...props}
		/>
	);
}

export function SheetViewport({
	className,
	side,
	variant = "default",
	...props
}: SheetPrimitive.Viewport.Props & {
	side?: "right" | "left" | "top" | "bottom";
	variant?: "default" | "inset";
}): React.ReactElement {
	return (
		<SheetPrimitive.Viewport
			className={clsx(
				css.viewport,
				side === "bottom" && css.viewportBottom,
				side === "top" && css.viewportTop,
				side === "left" && css.viewportLeft,
				side === "right" && css.viewportRight,
				variant === "inset" && css.viewportInset,
				className,
			)}
			data-slot="sheet-viewport"
			{...props}
		/>
	);
}

export function SheetPopup({
	className,
	children,
	showCloseButton = true,
	side = "right",
	variant = "default",
	closeProps,
	portalProps,
	...props
}: SheetPrimitive.Popup.Props & {
	showCloseButton?: boolean;
	side?: "right" | "left" | "top" | "bottom";
	variant?: "default" | "inset";
	closeProps?: SheetPrimitive.Close.Props;
	portalProps?: SheetPrimitive.Portal.Props;
}): React.ReactElement {
	return (
		<SheetPortal {...portalProps}>
			<SheetBackdrop />
			<SheetViewport side={side} variant={variant}>
				<SheetPrimitive.Popup
					className={clsx(
						css.popup,
						side === "bottom" && css.popupBottom,
						side === "top" && css.popupTop,
						side === "left" && css.popupLeft,
						side === "right" && css.popupRight,
						variant === "inset" && css.popupInset,
						className,
					)}
					data-slot="sheet-popup"
					{...props}
				>
					{children}
					{showCloseButton && (
						<SheetPrimitive.Close
							aria-label="Close"
							className={css.close}
							render={<Button size="icon" variant="ghost" />}
							{...closeProps}
						>
							<XIcon />
						</SheetPrimitive.Close>
					)}
				</SheetPrimitive.Popup>
			</SheetViewport>
		</SheetPortal>
	);
}

export function SheetHeader({
	className,
	render,
	...props
}: useRender.ComponentProps<"div">): React.ReactElement {
	const defaultProps = {
		className: clsx(css.header, className),
		"data-slot": "sheet-header",
	};

	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(defaultProps, props),
		render,
	});
}

export function SheetTitle({
	className,
	...props
}: SheetPrimitive.Title.Props): React.ReactElement {
	return (
		<SheetPrimitive.Title
			className={clsx(css.title, className)}
			data-slot="sheet-title"
			{...props}
		/>
	);
}

export function SheetDescription({
	className,
	...props
}: SheetPrimitive.Description.Props): React.ReactElement {
	return (
		<SheetPrimitive.Description
			className={clsx(css.description, className)}
			data-slot="sheet-description"
			{...props}
		/>
	);
}
