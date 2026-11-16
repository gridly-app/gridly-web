"use client";

import { clsx } from "clsx";
import * as React from "react";
import { readPreference, useMediaQuery, writePreference } from "@/shared/lib";
import styles from "./SidebarLayout.module.css";

const SIDEBAR_WIDTH: string = "16rem";
const SIDEBAR_WIDTH_ICON: string = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT: string = "b";

type SidebarContextProps = {
	state: "expanded" | "collapsed";
	open: boolean;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar(): SidebarContextProps {
	const context = React.useContext(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
}

export function SidebarProvider({
	className,
	style,
	children,
	...props
}: React.ComponentProps<"div">) {
	const isMobile = useMediaQuery("(width < 851px)");
	const [openMobile, setOpenMobile] = React.useState(false);
	const [open, setOpen] = React.useState(
		() => readPreference("gridly.sidebar") !== "false",
	);

	const toggleSidebar = React.useCallback(() => {
		if (isMobile) {
			setOpenMobile((current) => !current);

			return;
		}

		const next = !open;

		setOpen(next);
		writePreference("gridly.sidebar", String(next));
	}, [isMobile, open]);

	React.useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const isShortcut =
				event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
				(event.metaKey || event.ctrlKey);
			if (!isShortcut) return;

			event.preventDefault();
			toggleSidebar();
		}

		window.addEventListener("keydown", handleKeyDown);

		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleSidebar]);

	const state = open ? "expanded" : "collapsed";

	const contextValue = React.useMemo<SidebarContextProps>(
		() => ({
			isMobile,
			open,
			openMobile,
			setOpenMobile,
			state,
			toggleSidebar,
		}),
		[state, open, isMobile, openMobile, toggleSidebar],
	);

	const sidebarStyle: React.CSSProperties & {
		"--sidebar-width": string;
		"--sidebar-width-icon": string;
	} = {
		"--sidebar-width": SIDEBAR_WIDTH,
		"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
		...style,
	};

	return (
		<SidebarContext.Provider value={contextValue}>
			<div
				className={clsx(styles.wrapper, className)}
				data-slot="sidebar-wrapper"
				style={sidebarStyle}
				{...props}
			>
				{children}
			</div>
		</SidebarContext.Provider>
	);
}
