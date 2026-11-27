import { Link } from "react-router-dom";

import { adminLocation, shipmentAdminPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { formatMoment } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";

import type { WorkingShipment } from "../../api/shipment.dto";
import type { ShipmentCreation } from "../../api/shipmentCreationStorage";
import { canReplayLink } from "../../api/shipmentSharing";
import type { ShipmentResource } from "../../api/useShipmentResource";
import type { RunShipmentAction } from "../../model/useShipmentActions";
import { useShipmentSharingForm } from "../../model/useShipmentSharingForm";

import styles from "../../shared.module.css";

export function ShipmentSharing({
	warehouseId,
	orderId,
	shipment,
	canIssueLink,
	attempt,
	isBusy,
	run,
	issueLink,
	revokeLink,
	retryLink,
}: {
	warehouseId: string;
	orderId: string;
	shipment: Pick<WorkingShipment, "share_link" | "order" | "allowed_actions">;
	canIssueLink: boolean;
	attempt: ShipmentCreation | null | undefined;
	isBusy: boolean;
	run: RunShipmentAction;
	issueLink: ShipmentResource["issueLink"];
	revokeLink: ShipmentResource["revokeLink"];
	retryLink: ShipmentResource["retryLink"];
}) {
	const mode = useWorkspaceMode();
	const form = useShipmentSharingForm({
		shareLink: shipment.share_link,
		issueLink,
		revokeLink,
		retryLink,
		run,
	});
	const { share_link: shareLink, order } = shipment;
	const canManageAll = shipment.allowed_actions.includes("manage-all-links");
	const isLinkExpired =
		attempt?.kind === "link" && attempt.status === "secret-expired";
	const canRetry = canReplayLink(attempt);
	const hasAttempt = Boolean(attempt);
	const allLinksPath =
		shipmentAdminPath(mode) +
		adminLocation("links", {
			warehouse_id: warehouseId,
			linked_order_id: orderId,
		});
	const linkStatus = shareLink
		? `Действует до ${formatMoment(shareLink.expires_at, order.time_zone)}`
		: "Действующей ссылки нет.";
	const issueLabel = shareLink ? "Перевыпустить ссылку" : "Выпустить ссылку";
	const isIssueDisabled = isBusy || hasAttempt || !canIssueLink;
	const issueHintId = `${orderId}-link-unavailable`;
	const canRevoke = Boolean(shareLink) || isLinkExpired;
	const isRevokeDisabled = isBusy || (hasAttempt && !isLinkExpired);
	const confirmationTitle =
		form.confirmation === "revoke"
			? "Отозвать ссылку?"
			: "Перевыпустить ссылку?";

	return (
		<section className={styles.panel}>
			<h2>Клиентская ссылка</h2>
			<p>{linkStatus}</p>
			<form className={styles.row} onSubmit={form.handleSubmit}>
				<Field label="Действует до (UTC)">
					<Input
						type="datetime-local"
						required
						step="1"
						value={form.expiry}
						onChange={form.handleExpiryChange}
					/>
				</Field>
				<Button
					type="submit"
					disabled={isIssueDisabled}
					aria-describedby={canIssueLink ? undefined : issueHintId}
				>
					{issueLabel}
				</Button>
				{canRevoke && (
					<Button
						type="button"
						variant="destructive-outline"
						disabled={isRevokeDisabled}
						onClick={form.handleRequestRevoke}
					>
						Отозвать ссылку из карточки
					</Button>
				)}
			</form>
			{!canIssueLink && (
				<p id={issueHintId}>
					Клиентскую ссылку можно выпустить, когда заказ выйдет из черновика.
				</p>
			)}
			{canManageAll && (
				<Link to={allLinksPath}>Управлять всеми ссылками заказа</Link>
			)}
			{canRetry && (
				<Button
					variant="secondary"
					onClick={form.handleRetry}
					disabled={isBusy}
				>
					Повторить тот же выпуск
				</Button>
			)}
			{isLinkExpired && (
				<Feedback tone="warning">
					Ссылка {attempt.linkId} создана. Чтобы получить новый URL, отзовите
					её.
				</Feedback>
			)}
			{attempt?.status === "mismatch" && (
				<Feedback tone="error">
					Сервер отклонил повтор с этим ключом. Проверьте текущую ссылку.
				</Feedback>
			)}
			{form.url && (
				<div className={styles.row}>
					<Field label="Ссылка для клиента">
						<Input readOnly value={form.url} onFocus={form.handleLinkFocus} />
					</Field>
					<Button variant="secondary" onClick={form.handleCopyLink}>
						Копировать
					</Button>
				</div>
			)}
			{form.message && <Feedback tone="info">{form.message}</Feedback>}
			{form.confirmation && (
				<Modal title={confirmationTitle} onClose={form.handleCloseConfirmation}>
					<p>
						Текущая ссылка из карточки перестанет открывать заказ. Другие ссылки
						заказа этим не отзываются.
					</p>
					<div className={styles.row}>
						<Button onClick={form.handleConfirm}>Подтвердить</Button>
						<Button variant="secondary" onClick={form.handleCloseConfirmation}>
							Отмена
						</Button>
					</div>
				</Modal>
			)}
		</section>
	);
}
