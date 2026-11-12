"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type React from "react";

import css from "./badge.module.css";

export const badgeVariants = cva(css.root, {
	defaultVariants: {
		size: "default",
		variant: "default",
	},
	variants: {
		size: {
			default: css.sizeDefault,
			lg: css.sizeLg,
			sm: css.sizeSm,
		},
		variant: {
			default: css.variantDefault,
			destructive: css.variantDestructive,
			error: css.variantError,
			info: css.variantInfo,
			outline: css.variantOutline,
			secondary: css.variantSecondary,
			success: css.variantSuccess,
			warning: css.variantWarning,
		},
	},
});

export interface BadgeProps extends useRender.ComponentProps<"span"> {
	variant?: VariantProps<typeof badgeVariants>["variant"];
	size?: VariantProps<typeof badgeVariants>["size"];
	square?: boolean;
}

export function Badge({
	className,
	variant,
	size,
	square,
	render,
	...props
}: BadgeProps): React.ReactElement {
	const defaultProps = {
		className: clsx(
			square && css.rootSquare,
			badgeVariants({ className, size, variant }),
		),
		"data-slot": "badge",
	};

	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(defaultProps, props),
		render,
	});
}
