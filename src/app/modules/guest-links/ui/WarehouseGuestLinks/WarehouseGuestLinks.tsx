import { adminLocation } from "@/ports/navigation";
import type { Warehouse } from "@/domain/warehouse";
import type { HttpClient } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Link } from "@/shared/ui/navigation";
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
	linkedOrder,
}: {
	path: string;
	warehouse: Warehouse;
	http: HttpClient;
	initialOrder: string | null;
	linkedOrder: string | null;
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
	const resolution = unknownAttempt?.resolution;
	const linkId =
		resolution?.status === "secret-expired" ? resolution.linkId : undefined;
	const expiredLink = data.links?.find(({ id }) => id === linkId);

	function handleRevokeRecovered() {
		if (expiredLink) handleRevoke(expiredLink);
	}

	const canShowRecovery =
		unknownAttempt && !data.isAccessDenied && !activeDialog;

	const issuedIsActive = data.query.data?.items.some(
		({ id, status }) => id === issued?.id && status === "active",
	);
	const canShowIssuedLink = issued && !data.isListUnavailable && issuedIsActive;
	const isEditorOpen = activeDialog && activeDialog.type !== "revoke";
	const isCreatingOutsideEditor = creation.isPending && !isEditorOpen;
	const isCreationBlocked = Boolean(attempt || data.orderResource.error);
	const links = linkedOrder
		? data.links?.filter(({ order_ids }) => order_ids.includes(linkedOrder))
		: data.links;
	const linkedOrderNumber = linkedOrder
		? (data.orderById.get(linkedOrder)?.number ?? linkedOrder)
		: null;

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
					canRetry={creation.canRetry && !resolution}
					linkId={linkId}
					mismatch={resolution?.status === "mismatch"}
					onRevoke={expiredLink ? handleRevokeRecovered : undefined}
					onRefresh={creation.refreshList}
					onRetry={creation.retryCreation}
				/>
			)}
			{notice && <Feedback tone={notice.tone}>{notice.text}</Feedback>}
			{!activeDialog && creation.error instanceof Error && (
				<Feedback tone="info">{errorMessage(creation.error)}</Feedback>
			)}
			{canShowIssuedLink && (
				<IssuedGuestLink url={issued.url} onCopy={handleCopy} />
			)}
			{linkedOrderNumber && !data.isAccessDenied && (
				<p>
					Ссылки заказа {linkedOrderNumber}.{" "}
					<Link to={adminLocation("links", { warehouse_id: warehouse.id })}>
						Все ссылки склада
					</Link>
				</p>
			)}
			<WarehouseGuestLinksList
				key={unknownAttempt?.key ?? "links"}
				warehouse={warehouse}
				orderById={data.orderById}
				links={links}
				isSaving={isBusy}
				isCreationBlocked={isCreationBlocked}
				onCreate={handleCreate}
				onCopy={handleCopy}
				onEdit={handleEdit}
				onRevoke={handleRevoke}
			/>
			<GuestLinkDialogs
				dialog={activeDialog}
				initialOrder={initialOrder ?? linkedOrder}
				data={data}
				actions={actions}
				onClose={handleClose}
				onRestart={handleEdit}
			/>
		</>
	);
}
