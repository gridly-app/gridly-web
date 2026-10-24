import type { ComponentProps } from "react";
import styles from "./Feedback.module.css";
export type FeedbackProps = ComponentProps<"div"> & {
	tone?: "error" | "success" | "loading" | "empty";
	fill?: boolean;
};
export function Feedback({
	tone = "loading",
	fill = false,
	className = "",
	...props
}: FeedbackProps) {
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			className={`${styles[tone]} ${fill ? styles.fill : ""} ${className}`}
			{...props}
		/>
	);
}
