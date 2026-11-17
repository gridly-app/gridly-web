import type { Warehouse } from "@/domain/warehouse";
import type { HttpClient } from "@/shared/http";
import { Feedback } from "@/shared/ui/feedback";

import { useGuestLinkDialogs } from "../../model/useGuestLinkDialogs";
import { useWarehouseGuestLinkData } from "../../model/useWarehouseGuestLinkData";

import { GuestLinkDialogs } from "../GuestLinkDialogs/GuestLinkDialogs";
import { IssuedGuestLink } from "../IssuedGuestLink/IssuedGuestLink";
import { WarehouseGuestLinkFeedback } from "../WarehouseGuestLinkFeedback/WarehouseGuestLinkFeedback";
import { WarehouseGuestLinksList } from "../WarehouseGuestLinksList/WarehouseGuestLinksList";
import { GuestLinkCreationRecovery } from "../GuestLinkCreationRecovery/GuestLinkCreationRecovery";

export function WarehouseGuestLinks({
	path,
	warehouse,
	http,
	initialOrder,
}: {
	path: string;
	warehouse: Warehouse;
	http: HttpClient;
	initialOrder: string | null;
}) {
	const data = useWarehouseGuestLinkData(http, path, warehouse);
	const {
		activeDialog,
		actions,
		handleCreate,
		handleEdit,
		handleRevoke,
		handleClose,
	} = useGuestLinkDialogs(http, path, initialOrder, data);
	const { creation, isBusy, notice, handleCopy } = actions;
	const { attempt, issued } = creation;
	const unknownAttempt = attempt?.status === "unknown" ? attempt : null;
	const canShowRecovery =
		unknownAttempt && !data.isAccessDenied && !activeDialog;
	const canAcknowledge = Boolean(
		unknownAttempt?.hasRefreshedList &&
		data.query.isSuccess &&
		!data.query.isFetching,
	);
	const issuedIsActive = data.query.data?.items.some(
		({ id, status }) => id === issued?.id && status === "active",
	);
	const canShowIssuedLink = issued && !data.isListUnavailable && issuedIsActive;
	const isEditorOpen = activeDialog && activeDialog.type !== "revoke";
	const isCreatingOutsideEditor = creation.isPending && !isEditorOpen;
	const isCreationBlocked = Boolean(attempt || data.orderResource.error);

	return (
		<>
			<WarehouseGuestLinkFeedback
				query={data.query}
				orderResource={data.orderResource}
				isCreating={isCreatingOutsideEditor}
			/>
			{canShowRecovery && (
				<GuestLinkCreationRecovery
					name={unknownAttempt.input.name}
					message={unknownAttempt.message}
					isBusy={isBusy}
					canAcknowledge={canAcknowledge}
					canRetry={creation.canRetry}
					onRefresh={creation.refreshList}
					onRetry={creation.retryCreation}
					onAcknowledge={creation.acknowledgeCreation}
				/>
			)}
			{notice && <Feedback tone={notice.tone}>{notice.text}</Feedback>}
			{canShowIssuedLink && (
				<IssuedGuestLink url={issued.url} onCopy={handleCopy} />
			)}
			<WarehouseGuestLinksList
				key={unknownAttempt?.key ?? "links"}
				warehouse={warehouse}
				orderById={data.orderById}
				links={data.links}
				isSaving={isBusy}
				isCreationBlocked={isCreationBlocked}
				onCreate={handleCreate}
				onCopy={handleCopy}
				onEdit={handleEdit}
				onRevoke={handleRevoke}
			/>
			<GuestLinkDialogs
				dialog={activeDialog}
				initialOrder={initialOrder}
				data={data}
				actions={actions}
				onClose={handleClose}
				onRestart={handleEdit}
			/>
		</>
	);
}
