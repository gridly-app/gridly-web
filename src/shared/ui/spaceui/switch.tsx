"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { clsx } from "clsx";
import type React from "react";

import css from "./switch.module.css";

export function Switch({
	className,
	...props
}: SwitchPrimitive.Root.Props): React.ReactElement {
	return (
		<SwitchPrimitive.Root
			className={clsx(css.root, className)}
			data-slot="switch"
			{...props}
		>
			<SwitchPrimitive.Thumb
				className={clsx(css.thumb)}
				data-slot="switch-thumb"
			/>
		</SwitchPrimitive.Root>
	);
}
