import { Link } from "react-router-dom";

import { isReplayAvailable } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";
import { adminLocation, shipmentAdminPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { environment } from "@/shared/config";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import type { ShipmentCreation } from "../../api/shipmentCreationStorage";
import type { WorkingShipment } from "../../api/shipment.dto.ts";
import type { ShipmentResource } from "../../api/useShipmentResource";
import { useShipmentSharingForm } from "../../model/useShipmentSharingForm";
import type { RunShipmentAction } from "../../model/useShipmentActions";
import styles from "../../shared.module.css";

export function ShipmentSharing({
	warehouseId,
	orderId,
	issueLink,
	revokeLink,
	shipment,
	canIssueLink,
	run,
	busy,
	attempt,
	retryLink,
}: {
	warehouseId: string;
	orderId: string;
	issueLink: ShipmentResource["issueLink"];
	revokeLink: ShipmentResource["revokeLink"];
	shipment: Pick<WorkingShipment, "share_link" | "order" | "allowed_actions">;
	canIssueLink: boolean;
	run: RunShipmentAction;
	busy: boolean;
	attempt: ShipmentCreation | null | undefined;
	retryLink: ShipmentResource["retryLink"];
}) {
	const mode = useWorkspaceMode();
	const canManage = shipment.allowed_actions.includes("manage-all-links");
	const expired =
		attempt?.kind === "link" && attempt.status === "secret-expired";
	const canRetry =
		attempt?.kind === "link" &&
		attempt.status === "unknown" &&
		environment.adminGuestLinkReplay &&
		isReplayAvailable(attempt.startedAt);
	const allLinks = `${shipmentAdminPath(mode === "sandbox" ? "sandbox" : "standard")}${adminLocation(
		"links",
		{
			warehouse_id: warehouseId,
			linked_order_id: orderId,
		},
	)}`;
	const form = useShipmentSharingForm({
		shareLink: shipment.share_link,
		issueLink,
		revokeLink,
		retryLink,
		run,
	});
	const { expiry, url, message, confirm } = form;
	const isIssueDisabled = busy || !!attempt || !canIssueLink;
	const issueHintId = `${orderId}-link-unavailable`;

	return (
		<section className={styles.panel}>
			<h2>Клиентская ссылка</h2>
			<p>
				{shipment.share_link
					? `Действует до ${formatMoment(shipment.share_link.expires_at, shipment.order.time_zone)}`
					: "Действующей ссылки нет."}
			</p>
			<form className={styles.row} onSubmit={form.handleSubmit}>
				<Field label="Действует до (UTC)">
					<Input
						type="datetime-local"
						required
						step="1"
						value={expiry}
						onChange={form.handleExpiryChange}
					/>
				</Field>
				<Button
					type="submit"
					disabled={isIssueDisabled}
					aria-describedby={canIssueLink ? undefined : issueHintId}
				>
					{shipment.share_link ? "Перевыпустить ссылку" : "Выпустить ссылку"}
				</Button>
				{(shipment.share_link || expired) && (
					<Button
						type="button"
						variant="destructive-outline"
						disabled={busy || (!!attempt && !expired)}
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
			{canManage && <Link to={allLinks}>Управлять всеми ссылками заказа</Link>}
			{canRetry && (
				<Button variant="secondary" onClick={form.handleRetry} disabled={busy}>
					Повторить тот же выпуск
				</Button>
			)}
			{expired && (
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
			{url && (
				<div className={styles.row}>
					<Field label="Ссылка для клиента">
						<Input readOnly value={url} onFocus={form.handleLinkFocus} />
					</Field>
					<Button variant="secondary" onClick={form.handleCopyLink}>
						Копировать
					</Button>
				</div>
			)}
			{message && <Feedback tone="info">{message}</Feedback>}
			{confirm && (
				<Modal
					title={
						confirm === "revoke" ? "Отозвать ссылку?" : "Перевыпустить ссылку?"
					}
					onClose={form.handleCloseConfirmation}
				>
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
