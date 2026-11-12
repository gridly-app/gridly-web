"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { clsx } from "clsx";
import type React from "react";

import css from "./alert-dialog.module.css";

export const AlertDialog: typeof AlertDialogPrimitive.Root =
	AlertDialogPrimitive.Root;

export const AlertDialogPortal: typeof AlertDialogPrimitive.Portal =
	AlertDialogPrimitive.Portal;

export function AlertDialogBackdrop({
	className,
	...props
}: AlertDialogPrimitive.Backdrop.Props): React.ReactElement {
	return (
		<AlertDialogPrimitive.Backdrop
			className={clsx(css.backdrop, className)}
			data-slot="alert-dialog-backdrop"
			{...props}
		/>
	);
}

export function AlertDialogViewport({
	className,
	...props
}: AlertDialogPrimitive.Viewport.Props): React.ReactElement {
	return (
		<AlertDialogPrimitive.Viewport
			className={clsx(css.viewport, className)}
			data-slot="alert-dialog-viewport"
			{...props}
		/>
	);
}

export function AlertDialogPopup({
	className,
	bottomStickOnMobile = true,
	portalProps,
	...props
}: AlertDialogPrimitive.Popup.Props & {
	bottomStickOnMobile?: boolean;
	portalProps?: AlertDialogPrimitive.Portal.Props;
}): React.ReactElement {
	return (
		<AlertDialogPortal {...portalProps}>
			<AlertDialogBackdrop />
			<AlertDialogViewport
				className={clsx(bottomStickOnMobile && css.viewportBottomOnMobile)}
			>
				<AlertDialogPrimitive.Popup
					className={clsx(
						css.popup,
						bottomStickOnMobile && css.popupBottomOnMobile,
						className,
					)}
					data-slot="alert-dialog-popup"
					{...props}
				/>
			</AlertDialogViewport>
		</AlertDialogPortal>
	);
}

export function AlertDialogHeader({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.header, className)}
			data-slot="alert-dialog-header"
			{...props}
		/>
	);
}

export function AlertDialogFooter({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & {
	variant?: "default" | "bare";
}): React.ReactElement {
	return (
		<div
			className={clsx(
				css.footer,
				variant === "default" && css.footerDefault,
				variant === "bare" && css.footerBare,
				className,
			)}
			data-slot="alert-dialog-footer"
			{...props}
		/>
	);
}

export function AlertDialogTitle({
	className,
	...props
}: AlertDialogPrimitive.Title.Props): React.ReactElement {
	return (
		<AlertDialogPrimitive.Title
			className={clsx(css.title, className)}
			data-slot="alert-dialog-title"
			{...props}
		/>
	);
}

export function AlertDialogDescription({
	className,
	...props
}: AlertDialogPrimitive.Description.Props): React.ReactElement {
	return (
		<AlertDialogPrimitive.Description
			className={clsx(css.description, className)}
			data-slot="alert-dialog-description"
			{...props}
		/>
	);
}
