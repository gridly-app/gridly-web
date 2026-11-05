import type { ComponentProps } from "react";
import { Label } from "../spaceui/label";
import { Toolbar } from "../spaceui/toolbar";
import styles from "./FormLayout.module.css";

export function FormGrid({ className = "", ...props }: ComponentProps<"div">) {
	return <div className={`${styles.grid} ${className}`} {...props} />;
}

export function CheckLabel({
	className = "",
	htmlFor,
	children,
	...props
}: ComponentProps<"label">) {
	return (
		<Label
			htmlFor={htmlFor}
			className={`${styles.check} ${className}`}
			{...props}
		>
			{children}
		</Label>
	);
}

export function FormActions({
	className = "",
	...props
}: ComponentProps<"div">) {
	return <Toolbar className={`${styles.actions} ${className}`} {...props} />;
}
