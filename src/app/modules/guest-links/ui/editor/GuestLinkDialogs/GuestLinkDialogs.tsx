import type { GuestLink } from "../../../api/guestLink.dto";
import type {
	GuestLinkDialog,
	useGuestLinkActions,
} from "../../../model/editor/useGuestLinkActions";
import type { WarehouseGuestLinkData } from "../../../model/useWarehouseGuestLinkData";

import { GuestLinkEditorDialog } from "../GuestLinkEditorDialog/GuestLinkEditorDialog";
import { GuestLinkRevocation } from "../GuestLinkRevocation/GuestLinkRevocation";

export function GuestLinkDialogs({
	dialog,
	initialOrder,
	data,
	actions,
	onClose,
	onRestart,
}: {
	dialog: GuestLinkDialog | null;
	initialOrder: string | null;
	data: WarehouseGuestLinkData;
	actions: Pick<
		ReturnType<typeof useGuestLinkActions>,
		| "creation"
		| "changeError"
		| "isBusy"
		| "isRevoking"
		| "revokeLink"
		| "saveLink"
	>;
	onClose: () => void;
	onRestart: (link: GuestLink) => void;
}) {
	if (!dialog) return null;

	if (dialog.type === "revoke") {
		return (
			<GuestLinkRevocation
				link={dialog.link}
				orderById={data.orderById}
				isPending={actions.isRevoking}
				isBusy={actions.isBusy}
				error={actions.changeError}
				onClose={onClose}
				onRevoke={actions.revokeLink}
			/>
		);
	}

	return (
		<GuestLinkEditorDialog
			editor={dialog}
			initialOrder={initialOrder}
			data={data}
			actions={actions}
			onClose={onClose}
			onRestart={onRestart}
		/>
	);
}
