import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { WarmTooltip } from "../overlays/WarmTooltip";
import buttonStyles from "./Button.module.css";

export interface ButtonProps extends useRender.ComponentProps<"button"> {
	variant?: "default" | "secondary" | "ghost" | "text";
	size?: "sm" | "md" | "lg" | "icon" | "compact";
	fullWidth?: boolean;
	selected?: boolean;
	loading?: boolean;
	tooltip?: string;
}

export function Button({
	className = "",
	variant = "default",
	size = "md",
	fullWidth = false,
	selected,
	render,
	children,
	loading = false,
	disabled,
	tooltip,
	title,
	...props
}: ButtonProps) {
	const defaultProps = {
		className: `${buttonStyles.root} ${buttonStyles[variant]} ${buttonStyles[size]} ${fullWidth ? buttonStyles.fullWidth : ""} ${className}`,
		"data-control": "",
		type: render ? undefined : ("button" as const),
		disabled: Boolean(loading || disabled),
		"aria-busy": loading || undefined,
		"aria-pressed": selected,
		children,
	};
	const element = useRender({
		defaultTagName: "button",
		render,
		props: mergeProps<"button">(defaultProps, props),
	});
	const hint = tooltip || title || props["aria-label"];

	return hint ? <WarmTooltip content={hint}>{element}</WarmTooltip> : element;
}
