import styles from "./AuditEventButton.module.css";

export function AuditEventButton({
	eventId,
	onOpenEvent,
	children,
}: {
	eventId: string;
	onOpenEvent: (eventId: string) => void;
	children: string;
}) {
	function handleClick() {
		onOpenEvent(eventId);
	}

	return (
		<button
			className={styles.auditEventButton}
			type="button"
			onClick={handleClick}
		>
			{children}
		</button>
	);
}
