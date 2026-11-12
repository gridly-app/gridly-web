"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { clsx } from "clsx";
import type React from "react";

import css from "./avatar-extended.module.css";

export type AvatarVariant =
	| "all"
	| "lumina"
	| "shaula"
	| "singularity"
	| "triton"
	| "solar-flare"
	| "titan"
	| "glass"
	| "splash"
	| "astronaut"
	| "ghost"
	| "bot"
	| "glitch"
	| "animals"
	| "pebble"
	| "invader"
	| "grunge"
	| "bored"
	| "doodle"
	| "squiggle"
	| "critter"
	| "kendo";

export interface AvatarFallbackProps extends AvatarPrimitive.Fallback.Props {
	name?: string;
	variant?: AvatarVariant;
}

export function AvatarFallback({
	name,
	variant = "all",
	children,
	className,
	...props
}: AvatarFallbackProps): React.ReactElement {
	const resolvedName =
		name ?? (typeof children === "string" ? children : undefined) ?? "User";
	const src = `https://avatars.spaceui.one/v1?name=${encodeURIComponent(resolvedName)}&variant=${variant}`;

	return (
		<AvatarPrimitive.Fallback
			className={clsx(css.avatarFallback, className)}
			data-slot="avatar-fallback"
			{...props}
		>
			<img src={src} alt={resolvedName} className={css.img} />
		</AvatarPrimitive.Fallback>
	);
}

export function AvatarExtended({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={clsx(css.root, className)} {...props}>
			{children}
		</div>
	);
}
