import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type * as React from "react";
import { Spinner } from "@/shared/ui/spaceui/spinner";

import css from "./button.module.css";

export const buttonVariants = cva(css.root, {
	defaultVariants: {
		size: "default",
		variant: "default",
	},
	variants: {
		size: {
			default: css.sizeDefault,
			icon: css.sizeIcon,
			"icon-lg": css.sizeIconLg,
			"icon-sm": css.sizeIconSm,
			"icon-xl": css.sizeIconXl,
			"icon-xs": css.sizeIconXs,
			lg: css.sizeLg,
			sm: css.sizeSm,
			xl: css.sizeXl,
			xs: css.sizeXs,
		},
		variant: {
			default: css.variantDefault,
			destructive: css.variantDestructive,
			"destructive-outline": css.variantDestructiveOutline,
			ghost: css.variantGhost,
			link: css.variantLink,
			outline: css.variantOutline,
			secondary: css.variantSecondary,
		},
	},
});

export interface ButtonProps extends useRender.ComponentProps<"button"> {
	variant?: VariantProps<typeof buttonVariants>["variant"];
	size?: VariantProps<typeof buttonVariants>["size"];
	loading?: boolean;
}

export function Button({
	className,
	variant,
	size,
	render,
	children,
	loading = false,
	disabled: disabledProp,
	...props
}: ButtonProps): React.ReactElement {
	const isDisabled: boolean = Boolean(loading || disabledProp);
	const typeValue: React.ButtonHTMLAttributes<HTMLButtonElement>["type"] =
		render ? undefined : "button";

	const defaultProps = {
		children: (
			<>
				{children}
				{loading && (
					<Spinner
						className={css.loadingIndicator}
						data-slot="button-loading-indicator"
					/>
				)}
			</>
		),
		className: clsx(buttonVariants({ className, size, variant })),
		"aria-disabled": loading || undefined,
		"data-loading": loading ? "" : undefined,
		"data-slot": "button",
		disabled: isDisabled,
		type: typeValue,
	};

	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(defaultProps, props),
		render,
	});
}
