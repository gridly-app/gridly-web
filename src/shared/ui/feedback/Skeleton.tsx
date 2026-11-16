import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import styles from "./Skeleton.module.css";

type SkeletonProps = ComponentProps<"div"> & {
	layout?: "lines" | "page" | "table" | "map" | "form";
	label?: ReactNode;
};

export function Skeleton({
	layout = "lines",
	label = "Загружаем страницу…",
	className,
	...props
}: SkeletonProps) {
	return (
		<div
			{...props}
			className={clsx(styles.skeleton, styles[layout], className)}
			data-slot="skeleton"
			role="status"
		>
			<span className={styles.status}>{label}</span>
			<div className={styles.preview} aria-hidden="true">
				<div className={styles.heading}>
					<span />
					<span />
				</div>
				<div className={styles.body}>
					<span />
					<span />
					<span />
					<span />
				</div>
			</div>
		</div>
	);
}
