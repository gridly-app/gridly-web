"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type * as React from "react";
import { buttonVariants } from "@/shared/ui/spaceui/button";

import css from "./link.module.css";

export const linkVariants = cva(css.root, {
	defaultVariants: {
		variant: "default",
	},
	variants: {
		variant: {
			default: css.variantDefault,
			secondary: css.variantSecondary,
			underline: css.variantUnderline,
		},
	},
});

export interface LinkProps extends useRender.ComponentProps<"a"> {
	asButton?: boolean;
	variant?: VariantProps<typeof linkVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
	underline?: boolean;
}

export function Link({
	className,
	variant = "default",
	size = "default",
	underline = false,
	asButton = false,
	render,
	...props
}: LinkProps): React.ReactElement {
	const classes = asButton
		? clsx(
				buttonVariants({
					variant: variant as VariantProps<typeof buttonVariants>["variant"],
					size,
				}),
				className,
			)
		: clsx(
				linkVariants({ variant }),
				underline && css.underlineOnHover,
				className,
			);

	const defaultProps = {
		className: classes,
		"data-slot": "link",
	} as React.ComponentPropsWithRef<"a">;

	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(defaultProps, props),
		render,
	});
}
