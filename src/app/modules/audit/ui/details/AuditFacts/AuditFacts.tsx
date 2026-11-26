import { clsx } from "clsx";

import type { AuditFact } from "../../../model/events/auditEventFacts";

import sharedStyles from "../../../shared.module.css";
import styles from "./AuditFacts.module.css";

export function AuditFacts({
	facts,
	isTechnical = false,
}: {
	facts: AuditFact[];
	isTechnical?: boolean;
}) {
	return (
		<dl className={clsx(styles.facts, isTechnical && styles.technical)}>
			{facts.map(({ label, value, dateTime }) => {
				const text = dateTime ? (
					<time dateTime={dateTime}>{value}</time>
				) : (
					value
				);

				return (
					<div key={label} className={styles.fact}>
						<dt className={sharedStyles.label}>{label}</dt>
						<dd className={sharedStyles.value}>
							{isTechnical ? <code>{text}</code> : text}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}
