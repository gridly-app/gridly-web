import { clsx } from "clsx";
import type { MouseEvent } from "react";
import { WarmTooltip } from "../overlays/WarmTooltip";
import type { ButtonProps as SpaceButtonProps } from "../spaceui/button";
import { Button as SpaceButton } from "../spaceui/button";
import styles from "./Button.module.css";
export interface ButtonProps extends Omit<
	SpaceButtonProps,
	"variant" | "size"
> {
	variant?:
		| "default"
		| "secondary"
		| "ghost"
		| "text"
		| "destructive-outline"
		| "destructive"
		| undefined;
	size?: "sm" | "md" | "lg" | "icon" | "compact" | undefined;
	fullWidth?: boolean | undefined;
	selected?: boolean | undefined;
	tooltip?: string | false | undefined;
}
const baseVariants = {
	default: "default",
	secondary: "secondary",
	ghost: "ghost",
	text: "link",
	"destructive-outline": "destructive",
	destructive: "destructive",
} as const satisfies Record<
	NonNullable<ButtonProps["variant"]>,
	SpaceButtonProps["variant"]
>;

const baseSizes = {
	sm: "sm",
	md: "default",
	lg: "lg",
	icon: "icon",
	compact: "sm",
} as const satisfies Record<
	NonNullable<ButtonProps["size"]>,
	SpaceButtonProps["size"]
>;

export function Button({
	variant = "default",
	size = "md",
	fullWidth,
	selected,
	tooltip,
	title,
	className,
	...props
}: ButtonProps) {
	const hint =
		tooltip === false ? undefined : tooltip || title || props["aria-label"];
	const baseVariant = baseVariants[variant];

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		if (props.disabled) {
			event.preventDefault();

			return;
		}

		props.onClick?.(event);
	}

	const element = (
		<SpaceButton
			{...props}
			data-control="button"
			data-size={size}
			data-variant={baseVariant}
			disabled={!!props.disabled && !hint}
			aria-disabled={props.disabled || props.loading || undefined}
			onClick={handleClick}
			variant={baseVariant}
			size={baseSizes[size]}
			aria-pressed={selected ?? props["aria-pressed"]}
			aria-busy={props.loading || undefined}
			className={clsx(
				styles[size],
				fullWidth && styles.fullWidth,
				props.disabled && styles.disabled,
				className,
			)}
		/>
	);
	return hint ? <WarmTooltip content={hint}>{element}</WarmTooltip> : element;
}
