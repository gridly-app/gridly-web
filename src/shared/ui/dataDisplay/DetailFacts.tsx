import { clsx } from "clsx";
import type { ReactNode } from "react";
import styles from "./DetailFacts.module.css";

export function DetailFacts({
	children,
	className,
}: {
	children: ReactNode;
	className?: string | undefined;
}) {
	return <dl className={clsx(styles.facts, className)}>{children}</dl>;
}

export function DetailFact({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div>
			<dt>{label}</dt>
			<dd>{children}</dd>
		</div>
	);
}
