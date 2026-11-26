import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "../navigation/Link";
import { WarmTooltip } from "../overlays/WarmTooltip";
import { Button, type ButtonProps } from "./Button";
import styles from "./IconButton.module.css";

export interface IconButtonProps extends Omit<
	ButtonProps,
	"children" | "size"
> {
	label: string;
	icon: ReactNode;
}

export function IconLink({
	label,
	icon,
	to,
}: {
	label: string;
	icon: ReactNode;
	to: NonNullable<ComponentProps<typeof Link>["to"]>;
}) {
	return (
		<WarmTooltip content={label}>
			<Link
				asButton
				size="icon"
				variant="secondary"
				to={to}
				aria-label={label}
				data-action-icon=""
				className={styles.icon}
			>
				{icon}
			</Link>
		</WarmTooltip>
	);
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
