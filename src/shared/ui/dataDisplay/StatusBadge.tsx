import type { ReactNode } from "react";
import statusStyles from "./StatusBadge.module.css";

export type StatusBadgeProps = {
	status: "online" | "offline" | "busy" | "info";
	primaryText: string;
	children?: ReactNode | undefined;
	animated?: boolean | undefined;
	compactOnMobile?: boolean | undefined;
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
			className={`${statusStyles.statusBadge} ${compactOnMobile ? statusStyles.compact : ""}`}
			data-status={status}
		>
			<span
				className={`${statusStyles.statusIndicator} ${animated ? statusStyles.statusAnimated : ""}`}
				aria-hidden="true"
			>
				<span className={statusStyles.statusWave} />
				<span className={statusStyles.statusDot} />
			</span>
			<b>{primaryText}</b>
			{children && (
				<span className={statusStyles.statusSecondary}>{children}</span>
			)}
		</div>
	);
}
