import type { ReactNode } from "react";
import statusStyles from "./StatusBadge.module.css";

export type StatusBadgeProps = {
	status: "online" | "offline" | "busy" | "info";
	primaryText: string;
	children?: ReactNode;
	animated?: boolean;
	compactOnMobile?: boolean;
};

export function StatusBadge({
	status,
	primaryText,
	children,
	animated = true,
	compactOnMobile = false,
}: StatusBadgeProps) {
	return (
		<div
			className={`${statusStyles["status-badge"]} ${compactOnMobile ? statusStyles.compact : ""}`}
			data-status={status}
		>
			<span
				className={`${statusStyles["status-indicator"]} ${animated ? statusStyles["status-animated"] : ""}`}
				aria-hidden="true"
			>
				<span className={statusStyles["status-wave"]} />
				<span className={statusStyles["status-dot"]} />
			</span>
			<b>{primaryText}</b>
			{children && (
				<span className={statusStyles["status-secondary"]}>{children}</span>
			)}
		</div>
	);
}
