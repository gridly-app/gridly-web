import type { ReactNode } from "react";
import styles from "./StableLabel.module.css";

export function StableLabel({
	children,
	variants,
}: {
	children: ReactNode;
	variants: readonly string[];
}) {
	return (
		<span className={styles.label}>
			{variants.map((label) => (
				<span key={label} className={styles.reserve} aria-hidden="true">
					{label}
				</span>
			))}
			<span className={styles.value}>{children}</span>
		</span>
	);
}
