import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";
import styles from "./IconButton.module.css";

export interface IconButtonProps
	extends Omit<ButtonProps, "children" | "size"> {
	label: string;
	icon: ReactNode;
}
export function IconButton({
	label,
	icon,
	className,
	variant = "ghost",
	...props
}: IconButtonProps) {
	return (
		<Button
			{...props}
			variant={variant}
			size="icon"
			aria-label={label}
			data-action-icon=""
			className={clsx(styles.icon, className)}
		>
			{icon}
		</Button>
	);
}
