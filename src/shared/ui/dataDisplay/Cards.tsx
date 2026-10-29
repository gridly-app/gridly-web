import type { ComponentProps } from "react";
import styles from "./DataPanel.module.css";

export function MiniCard({ className = "", ...props }: ComponentProps<"div">) {
	return <div className={`${styles.miniCard} ${className}`} {...props} />;
}

export function TableIcon({
	className = "",
	...props
}: ComponentProps<"span">) {
	return <span className={`${styles.tableIcon} ${className}`} {...props} />;
}
