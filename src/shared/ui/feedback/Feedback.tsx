import { IconAlertCircle } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import styles from "./Feedback.module.css";
export type FeedbackProps = ComponentProps<"div"> & {
	tone?: ("error" | "success" | "loading" | "empty") | undefined;
	fill?: boolean | undefined;
};
export function Feedback({
	tone = "loading",
	fill = false,
	className = "",
	children,
	...props
}: FeedbackProps) {
	return (
		<div
			role={tone === "error" ? "alert" : "status"}
			className={`${styles[tone]} ${fill ? styles.fill : ""} ${className}`}
			{...props}
		>
			{tone === "error" ? (
				<>
					<IconAlertCircle
						className={styles.errorIcon}
						size={20}
						aria-hidden="true"
					/>
					<div className={styles.errorMessage}>{children}</div>
				</>
			) : (
				children
			)}
		</div>
	);
}
