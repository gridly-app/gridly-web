"use client";

import { clsx } from "clsx";
import { PanelLeftIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "../button";
import styles from "./SidebarControls.module.css";
import { useSidebar } from "./SidebarProvider";

export function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<typeof Button>): React.ReactElement {
	const { isMobile, open, openMobile, toggleSidebar } = useSidebar();

	return (
		<Button
			className={clsx(styles.trigger, className)}
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			aria-expanded={isMobile ? openMobile : open}
			onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(event);
				toggleSidebar();
			}}
			size="icon"
			variant="ghost"
			{...props}
		>
			<PanelLeftIcon />
			<span className={styles.triggerLabel}>Toggle Sidebar</span>
		</Button>
	);
}
