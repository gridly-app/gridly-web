"use client";

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar";
import { clsx } from "clsx";
import type React from "react";

import css from "./toolbar.module.css";

export function Toolbar({
	className,
	...props
}: ToolbarPrimitive.Root.Props): React.ReactElement {
	return (
		<ToolbarPrimitive.Root
			className={clsx(css.root, className)}
			data-slot="toolbar"
			{...props}
		/>
	);
}

export function ToolbarGroup({
	className,
	...props
}: ToolbarPrimitive.Group.Props): React.ReactElement {
	return (
		<ToolbarPrimitive.Group
			className={clsx(css.group, className)}
			data-slot="toolbar-group"
			{...props}
		/>
	);
}
