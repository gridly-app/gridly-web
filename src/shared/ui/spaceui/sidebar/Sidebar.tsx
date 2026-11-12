"use client";

import { clsx } from "clsx";
import type * as React from "react";
import {
	Sheet,
	SheetDescription,
	SheetHeader,
	SheetPopup,
	SheetTitle,
} from "../sheet";
import styles from "./SidebarLayout.module.css";
import { useSidebar } from "./SidebarProvider";

const MOBILE_WIDTH = "18rem";

export function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
}): React.ReactElement {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div
				className={clsx(styles.staticPanel, className)}
				data-slot="sidebar"
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		return (
			<Sheet onOpenChange={setOpenMobile} open={openMobile}>
				<SheetPopup
					className={clsx(styles.mobilePanel, className)}
					{...props}
					data-mobile="true"
					data-sidebar="sidebar"
					data-slot="sidebar"
					side={side}
					showCloseButton={false}
					style={{ "--sidebar-width": MOBILE_WIDTH } as React.CSSProperties}
				>
					<SheetHeader className={styles.mobileHeading}>
						<SheetTitle>Навигация</SheetTitle>
						<SheetDescription>Разделы рабочего пространства.</SheetDescription>
					</SheetHeader>
					<div className={styles.mobileContent}>{children}</div>
				</SheetPopup>
			</Sheet>
		);
	}

	return (
		<div
			className={styles.desktop}
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-side={side}
			data-slot="sidebar"
			data-state={state}
			data-variant={variant}
		>
			<div className={styles.gap} data-slot="sidebar-gap" />
			<div
				className={clsx(styles.container, className)}
				data-slot="sidebar-container"
				{...props}
			>
				<div
					className={styles.panel}
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
				>
					{children}
				</div>
			</div>
		</div>
	);
}
