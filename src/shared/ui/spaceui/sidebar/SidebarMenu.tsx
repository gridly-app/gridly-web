"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import type * as React from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../tooltip";
import styles from "./SidebarMenu.module.css";
import { useSidebar } from "./SidebarProvider";

export function SidebarMenu({
	className,
	...props
}: React.ComponentProps<"ul">): React.ReactElement {
	return (
		<ul
			className={clsx(styles.menu, className)}
			data-sidebar="menu"
			data-slot="sidebar-menu"
			{...props}
		/>
	);
}

export function SidebarMenuItem({
	className,
	...props
}: React.ComponentProps<"li">): React.ReactElement {
	return (
		<li
			className={clsx(styles.item, className)}
			data-sidebar="menu-item"
			data-slot="sidebar-menu-item"
			{...props}
		/>
	);
}

export function SidebarMenuButton({
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	render,
	...props
}: useRender.ComponentProps<"button"> & {
	isActive?: boolean;
	tooltip?: string | React.ComponentProps<typeof TooltipPopup>;
	size?: "default" | "lg" | "sm" | null;
	variant?: "default" | "outline" | null;
}): React.ReactElement {
	const { isMobile, state } = useSidebar();

	const defaultProps = {
		className: clsx(
			styles.menuButton,
			size && styles[size],
			variant === "outline" && styles.outline,
			className,
		),
		"data-active": isActive,
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-slot": "sidebar-menu-button",
	};

	const buttonProps = mergeProps<"button">(defaultProps, props);

	const buttonElement = useRender({
		defaultTagName: "button",
		props: buttonProps,
		render,
	});

	if (!tooltip) {
		return buttonElement;
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		};
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={buttonElement as React.ReactElement<Record<string, unknown>>}
			/>
			<TooltipPopup
				align="center"
				hidden={state !== "collapsed" || isMobile}
				side="right"
				{...tooltip}
			/>
		</Tooltip>
	);
}
