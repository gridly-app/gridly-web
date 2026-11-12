"use client";

import { clsx } from "clsx";
import type * as React from "react";
import { ScrollArea } from "../scroll-area";
import styles from "./SidebarLayout.module.css";

export function SidebarHeader({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(styles.section, className)}
			data-sidebar="header"
			data-slot="sidebar-header"
			{...props}
		/>
	);
}

export function SidebarFooter({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(styles.section, className)}
			data-sidebar="footer"
			data-slot="sidebar-footer"
			{...props}
		/>
	);
}

export function SidebarContent({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<ScrollArea className={styles.scrollArea} fill overscrollContain scrollFade>
			<div
				className={clsx(styles.content, className)}
				data-sidebar="content"
				data-slot="sidebar-content"
				{...props}
			/>
		</ScrollArea>
	);
}
