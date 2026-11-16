import type { ComponentProps } from "react";
import { WarmTooltip } from "../overlays/WarmTooltip";
import {
	SidebarMenuButton as SpaceMenuButton,
	Sidebar as SpaceSidebar,
	SidebarTrigger as SpaceSidebarTrigger,
	useSidebar,
} from "../spaceui/sidebar";

export {
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarProvider,
	useSidebar,
} from "../spaceui/sidebar";
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
