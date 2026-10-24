import type { ComponentProps } from "react";
import styles from "./Badge.module.css";
export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "accent";
export function Badge({
	tone = "success",
	className = "",
	...props
}: ComponentProps<"span"> & { tone?: BadgeTone }) {
	return (
		<span
			className={`${styles.badge} ${styles[tone]} ${className}`}
			{...props}
		/>
	);
}
