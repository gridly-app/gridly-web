import { useState } from "react";
import { formatMoment } from "@/domain/shipment";
import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import type { WorkingShipment } from "../../model/shipment.dto.ts";
import type { ShipmentResource } from "../../api/useShipmentResource";
import type { RunShipmentAction } from "../../ShipmentManagement";
import styles from "../../shared.module.css";

export function ShipmentSharing({
	issueLink,
	revokeLink,
	shipment,
	run,
	busy,
}: {
	issueLink: ShipmentResource["issueLink"];
	revokeLink: ShipmentResource["revokeLink"];
	shipment: Pick<WorkingShipment, "share_link" | "order">;
	run: RunShipmentAction;
	busy: boolean;
}) {
	const [expiry, setExpiry] = useState(() =>
		toUtcDateTimeInput(Date.now() + 7 * 86400000),
	);
	const [issued, setIssued] = useState<{
		url: string;
		expires_at: string;
	} | null>(null);
	const url =
		issued &&
		shipment.share_link &&
		Date.parse(issued.expires_at) ===
			Date.parse(shipment.share_link.expires_at) &&
		Date.parse(issued.expires_at) > Date.now()
			? issued.url
			: "";
	const [message, setMessage] = useState("");
	const [confirm, setConfirm] = useState<"issue" | "revoke" | null>(null);

	function handleIssue() {
		const expiresAt = parseUtcDateTimeInput(expiry);

		if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
			setMessage("Выберите срок действия в будущем.");
			return;
		}

		setConfirm(null);
		setMessage("");

		void run(
			async (signal) => {
				const result = await issueLink(expiresAt, signal);

				setIssued(result);
			},
			{ refreshAfterWrite: true },
		);
	}

	function handleRevoke() {
		setConfirm(null);
		setMessage("");

		void run(
			async (signal) => {
				await revokeLink(signal);
				setIssued(null);
			},
			{ refreshAfterWrite: true },
		);
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(url);
			setMessage("Ссылка скопирована.");
		} catch {
			setMessage("Скопируйте ссылку из поля вручную.");
		}
	}
	return (
		<section className={styles.panel}>
			<h2>Клиентская ссылка</h2>
			<p>
				{shipment.share_link
					? `Действует до ${formatMoment(shipment.share_link.expires_at, shipment.order.time_zone)}`
					: "Действующей ссылки нет."}
			</p>
			<form
				className={styles.row}
				onSubmit={(event) => {
					event.preventDefault();
					if (shipment.share_link) setConfirm("issue");
					else handleIssue();
				}}
			>
				<Field label="Действует до (UTC)">
					<Input
						type="datetime-local"
						required
						step="1"
						value={expiry}
						onChange={(event) => setExpiry(event.target.value)}
					/>
				</Field>
				<Button type="submit" disabled={busy}>
					{shipment.share_link ? "Перевыпустить ссылку" : "Выпустить ссылку"}
				</Button>
				{shipment.share_link && (
					<Button
						type="button"
						variant="destructive-outline"
						disabled={busy}
						onClick={() => setConfirm("revoke")}
					>
						Отозвать ссылку
					</Button>
				)}
			</form>
			{url && (
				<div className={styles.row}>
					<Field label="Ссылка для клиента">
						<Input
							readOnly
							value={url}
							onFocus={(event) => event.target.select()}
						/>
					</Field>
					<Button variant="secondary" onClick={() => void copyLink()}>
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
					onClose={() => setConfirm(null)}
				>
					<p>Текущая ссылка перестанет открывать заказ.</p>
					<div className={styles.row}>
						<Button onClick={confirm === "revoke" ? handleRevoke : handleIssue}>
							Подтвердить
						</Button>
						<Button variant="secondary" onClick={() => setConfirm(null)}>
							Отмена
						</Button>
					</div>
				</Modal>
			)}
		</section>
	);
}
