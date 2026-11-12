import { type ComponentProps, useState } from "react";
import { readPreference, writePreference } from "@/shared/lib";
import { WarmTooltip } from "../overlays/WarmTooltip";
import {
	SidebarMenuButton as SpaceMenuButton,
	Sidebar as SpaceSidebar,
	SidebarProvider as SpaceSidebarProvider,
	SidebarTrigger as SpaceSidebarTrigger,
	useSidebar,
} from "../spaceui/sidebar";

export {
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	useSidebar,
} from "../spaceui/sidebar";
export function SidebarProvider(
	props: ComponentProps<typeof SpaceSidebarProvider>,
) {
	const [open, setOpen] = useState(
		() => readPreference("gridly.sidebar") !== "false",
	);
	return (
		<SpaceSidebarProvider
			{...props}
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				writePreference("gridly.sidebar", String(next));
			}}
		/>
	);
}
export function Sidebar(props: ComponentProps<typeof SpaceSidebar>) {
	return <SpaceSidebar collapsible="icon" {...props} />;
}

export function SidebarMenuButton({
	onClick,
	tooltip,
	...props
}: ComponentProps<typeof SpaceMenuButton>) {
	const { isMobile, state, setOpenMobile } = useSidebar();
	const element = (
		<SpaceMenuButton
			{...props}
			onClick={(event) => {
				onClick?.(event);
				if (isMobile && !event.defaultPrevented) setOpenMobile(false);
			}}
		/>
	);
	return (
		<WarmTooltip
			content={typeof tooltip === "string" ? tooltip : tooltip?.children}
			side="right"
			disabled={state !== "collapsed" || isMobile}
		>
			{element}
		</WarmTooltip>
	);
}

export function SidebarTrigger(
	props: ComponentProps<typeof SpaceSidebarTrigger>,
) {
	const { state } = useSidebar();
	return (
		<WarmTooltip
			content={state === "expanded" ? "Свернуть меню" : "Развернуть меню"}
			side="right"
		>
			<SpaceSidebarTrigger
				aria-label={state === "expanded" ? "Свернуть меню" : "Развернуть меню"}
				{...props}
			/>
		</WarmTooltip>
	);
}
