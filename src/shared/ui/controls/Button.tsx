import { cn } from "@/shared/lib/spaceui/utils";
import { WarmTooltip } from "../overlays/WarmTooltip";
import type { ButtonProps as SpaceButtonProps } from "../spaceui/button";
import { Button as SpaceButton } from "../spaceui/button";
export interface ButtonProps
	extends Omit<SpaceButtonProps, "variant" | "size"> {
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
	const element = (
		<SpaceButton
			{...props}
			data-control="button"
			data-size={size}
			data-variant={
				variant === "text"
					? "link"
					: variant === "destructive-outline"
						? "destructive"
						: variant
			}
			disabled={!!props.disabled && !hint}
			aria-disabled={props.disabled || props.loading || undefined}
			onClick={(event) => {
				if (props.disabled) {
					event.preventDefault();
					return;
				}
				props.onClick?.(event);
			}}
			variant={
				variant === "text"
					? "link"
					: variant === "destructive-outline"
						? "destructive"
						: variant
			}
			size={size === "md" ? "default" : size === "compact" ? "sm" : size}
			aria-pressed={selected ?? props["aria-pressed"]}
			aria-busy={props.loading || undefined}
			className={cn(
				size === "md" && "h-10 px-4",
				size === "sm" && "h-9 px-3",
				size === "lg" && "h-12 px-6",
				size === "icon" && "size-10",
				fullWidth && "w-full",
				props.disabled && "opacity-64 cursor-not-allowed",
				selected && "border-primary/40 bg-accent text-accent-foreground",
				className,
			)}
		/>
	);
	return hint ? <WarmTooltip content={hint}>{element}</WarmTooltip> : element;
}
