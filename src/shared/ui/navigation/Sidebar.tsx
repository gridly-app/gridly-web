import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import {
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { type ComponentProps, useContext } from "react";
import { sidebarContext, useSidebarState } from "@/shared/lib";
import { Button } from "../controls/Button";
import { WarmTooltip } from "../overlays/WarmTooltip";
import sidebarStyles from "./Sidebar.module.css";

export interface SidebarMenuButtonProps extends useRender.ComponentProps<"a"> {
	tooltip: string;
}

export function SidebarProvider({ children, ...props }: ComponentProps<"div">) {
	const model = useSidebarState();

	return (
		<sidebarContext.Provider value={model}>
			<div
				data-slot="sidebar-wrapper"
				data-state={model.open ? "expanded" : "collapsed"}
				{...props}
			>
				{children}
			</div>
		</sidebarContext.Provider>
	);
}

export function Sidebar({ className = "", ...props }: ComponentProps<"aside">) {
	const { open } = useContext(sidebarContext);

	return (
		<aside
			data-slot="sidebar"
			data-state={open ? "expanded" : "collapsed"}
			className={`${sidebarStyles.sidebar} ${className}`}
			{...props}
		/>
	);
}

export function SidebarHeader({
	className = "",
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={`${sidebarStyles.header} ${className}`}
			data-slot="sidebar-header"
			{...props}
		/>
	);
}

export function SidebarContent({
	className = "",
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={`${sidebarStyles.content} ${className}`}
			data-slot="sidebar-content"
			{...props}
		/>
	);
}

export function SidebarFooter({
	className = "",
	...props
}: ComponentProps<"div">) {
	return (
		<div
			className={`${sidebarStyles.footer} ${className}`}
			data-slot="sidebar-footer"
			{...props}
		/>
	);
}

export function SidebarMenu({
	className = "",
	...props
}: ComponentProps<"ul">) {
	return (
		<ul
			className={`${sidebarStyles.menu} ${className}`}
			data-slot="sidebar-menu"
			{...props}
		/>
	);
}

export function SidebarMenuItem(props: ComponentProps<"li">) {
	return <li data-slot="sidebar-menu-item" {...props} />;
}

function getSidebarToggleLabel(open: boolean, mobile: boolean) {
	if (mobile) {
		return open ? "Свернуть меню" : "Развернуть меню";
	}

	return open ? "Свернуть сайдбар" : "Развернуть сайдбар";
}

export function SidebarTrigger({ className = "" }: { className?: string }) {
	const { toggleSidebar, open, mobile } = useContext(sidebarContext);
	const label = getSidebarToggleLabel(open, mobile);

	return (
		<Button
			tooltip={`${label} · Ctrl / ⌘ B`}
			variant="ghost"
			className={`${sidebarStyles.trigger} ${className}`}
			aria-label={label}
			onClick={toggleSidebar}
		>
			{open ? (
				<IconLayoutSidebarLeftCollapse size={20} />
			) : (
				<IconLayoutSidebarLeftExpand size={20} />
			)}
		</Button>
	);
}

export function SidebarMenuButton({
	render,
	tooltip,
	...props
}: SidebarMenuButtonProps) {
	const { open } = useContext(sidebarContext);
	const defaultProps = { className: sidebarStyles.menuButton };
	const element = useRender({
		defaultTagName: "a",
		render,
		props: mergeProps<"a">(defaultProps, props),
		state: {
			state: open ? "expanded" : "collapsed",
			slot: "sidebar-menu-button",
		},
	});

	return (
		<WarmTooltip content={tooltip} side="right" disabled={open}>
			{element}
		</WarmTooltip>
	);
}
