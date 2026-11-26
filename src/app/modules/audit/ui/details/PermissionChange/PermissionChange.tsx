import type { PermissionDiff } from "../../../model/changes/auditPermissionChanges";
import { PermissionList } from "../PermissionList/PermissionList";

import sharedStyles from "../../../shared.module.css";

export function PermissionChange({
	permissions,
}: {
	permissions: PermissionDiff;
}) {
	const hasAdded = permissions.added.length > 0;
	const hasRemoved = permissions.removed.length > 0;
	const isUnchanged = !hasAdded && !hasRemoved;

	return (
		<>
			<PermissionList label="Было" items={permissions.before} />
			<PermissionList label="Стало" items={permissions.after} />
			{hasAdded && (
				<PermissionList label="Добавлены права" items={permissions.added} />
			)}
			{hasRemoved && (
				<PermissionList label="Удалены права" items={permissions.removed} />
			)}
			{isUnchanged && (
				<dd className={sharedStyles.value}>Список прав не изменился.</dd>
			)}
		</>
	);
}
