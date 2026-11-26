import {
	DeleteRowAction,
	EditRowAction,
	managementStyles as styles,
} from "@/shared/ui/management";

import type { GuestLink } from "../../../api/guestLink.dto";

export function GuestLinkRowActions({
	link,
	isSaving,
	onEdit,
	onRevoke,
}: {
	link: GuestLink;
	isSaving: boolean;
	onEdit: (link: GuestLink) => void;
	onRevoke: (link: GuestLink) => void;
}) {
	if (link.status !== "active") return null;

	const label = link.name || link.id;

	function handleEdit() {
		onEdit(link);
	}

	function handleRevoke() {
		onRevoke(link);
	}

	return (
		<div className={styles.actions}>
			<EditRowAction
				label={`Изменить гостевую ссылку: ${label}`}
				disabled={isSaving}
				onClick={handleEdit}
			/>
			<DeleteRowAction
				label={`Отозвать гостевую ссылку: ${label}`}
				disabled={isSaving}
				onClick={handleRevoke}
			/>
		</div>
	);
}
