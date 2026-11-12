"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import { XIcon } from "lucide-react";
import type React from "react";
import { Button } from "@/shared/ui/spaceui/button";
import { ScrollArea } from "@/shared/ui/spaceui/scroll-area";

import css from "./dialog.module.css";

export const Dialog: typeof DialogPrimitive.Root = DialogPrimitive.Root;

export const DialogPortal: typeof DialogPrimitive.Portal =
	DialogPrimitive.Portal;

export function DialogBackdrop({
	className,
	...props
}: DialogPrimitive.Backdrop.Props): React.ReactElement {
	return (
		<DialogPrimitive.Backdrop
			className={clsx(css.backdrop, className)}
			data-slot="dialog-backdrop"
			{...props}
		/>
	);
}

export function DialogViewport({
	className,
	...props
}: DialogPrimitive.Viewport.Props): React.ReactElement {
	return (
		<DialogPrimitive.Viewport
			className={clsx(css.viewport, className)}
			data-slot="dialog-viewport"
			{...props}
		/>
	);
}

export function DialogPopup({
	className,
	children,
	showCloseButton = true,
	bottomStickOnMobile = true,
	closeProps,
	portalProps,
	...props
}: DialogPrimitive.Popup.Props & {
	showCloseButton?: boolean;
	bottomStickOnMobile?: boolean;
	closeProps?: DialogPrimitive.Close.Props;
	portalProps?: DialogPrimitive.Portal.Props;
}): React.ReactElement {
	return (
		<DialogPortal {...portalProps}>
			<DialogBackdrop />
			<DialogViewport
				className={clsx(bottomStickOnMobile && css.viewportBottomOnMobile)}
			>
				<DialogPrimitive.Popup
					className={clsx(
						css.popup,
						bottomStickOnMobile && css.popupBottomOnMobile,
						className,
					)}
					data-slot="dialog-popup"
					{...props}
				>
					{children}
					{showCloseButton && (
						<DialogPrimitive.Close
							aria-label="Close"
							className={css.close}
							render={<Button size="icon" variant="ghost" />}
							{...closeProps}
						>
							<XIcon />
						</DialogPrimitive.Close>
					)}
				</DialogPrimitive.Popup>
			</DialogViewport>
		</DialogPortal>
	);
}

export function DialogHeader({
	className,
	render,
	...props
}: useRender.ComponentProps<"div">): React.ReactElement {
	const defaultProps = {
		className: clsx(css.header, className),
		"data-slot": "dialog-header",
	};

	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(defaultProps, props),
		render,
	});
}

export function DialogTitle({
	className,
	...props
}: DialogPrimitive.Title.Props): React.ReactElement {
	return (
		<DialogPrimitive.Title
			className={clsx(css.title, className)}
			data-slot="dialog-title"
			{...props}
		/>
	);
}

export function DialogPanel({
	className,
	scrollFade = true,
	render,
	...props
}: useRender.ComponentProps<"div"> & {
	scrollFade?: boolean;
}): React.ReactElement {
	const defaultProps = {
		className: clsx(css.panel, className),
		"data-slot": "dialog-panel",
	};

	return (
		<ScrollArea overscrollContain scrollFade={scrollFade}>
			{useRender({
				defaultTagName: "div",
				props: mergeProps<"div">(defaultProps, props),
				render,
			})}
		</ScrollArea>
	);
}
