import type { ReactNode } from "react";
import { cn } from "@/shared/lib/spaceui/utils";
import { Button, type ButtonProps } from "./Button";

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
			className={cn("action-icon", className)}
		>
			{icon}
		</Button>
	);
}
