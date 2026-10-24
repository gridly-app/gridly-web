import type { ComponentProps } from "react";
import styles from "./DataPanel.module.css";
export function MiniCard({ className = "", ...props }: ComponentProps<"div">) {
	return <div className={`${styles["mini-card"]} ${className}`} {...props} />;
}
export function TableIcon({
	className = "",
	...props
}: ComponentProps<"span">) {
	return <span className={`${styles["table-icon"]} ${className}`} {...props} />;
}
