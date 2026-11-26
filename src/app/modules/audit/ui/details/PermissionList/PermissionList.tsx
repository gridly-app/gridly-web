import sharedStyles from "../../../shared.module.css";
import styles from "./PermissionList.module.css";

export function PermissionList({
	label,
	items,
}: {
	label: string;
	items: string[];
}) {
	return (
		<dd className={sharedStyles.value}>
			<span className={sharedStyles.changeLabel}>{label}:</span>
			{items.length ? (
				<ul className={styles.permissionList}>
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : (
				" Нет прав"
			)}
		</dd>
	);
}
