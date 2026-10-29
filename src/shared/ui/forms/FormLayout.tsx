import type { ComponentProps } from "react";
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
		<label
			htmlFor={htmlFor}
			className={`${styles.check} ${className}`}
			{...props}
		>
			{children}
		</label>
	);
}

export function FormActions({
	className = "",
	...props
}: ComponentProps<"div">) {
	return <div className={`${styles.actions} ${className}`} {...props} />;
}
