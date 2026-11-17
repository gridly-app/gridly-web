import { type FormEvent, useRef, useState } from "react";
import { categories, formatMoment, issuedLinkSchema } from "@/domain/shipment";
import { type HttpClient, parseResponse } from "@/shared/http";
import { Button, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Combobox, Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import type { WorkingShipment } from "../model/shipment.dto";
import { dateInput, utcInput } from "../model/shipmentEditor";
import type { RunShipmentAction } from "./ShipmentManagement";
import styles from "./ShipmentManagement.module.css";

export function ShipmentSharing({
	http,
	path,
	shipment,
	run,
	busy,
	refresh,
}: {
	http: HttpClient;
	path: string;
	shipment: WorkingShipment;
	run: RunShipmentAction;
	busy: boolean;
	refresh: () => Promise<void>;
}) {
	const [expiry, setExpiry] = useState(() =>
		dateInput(new Date(Date.now() + 7 * 86400000).toISOString()),
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
	const issue = useRef<{ expiry: string; key: string } | null>(null);
	const uploadForm = useRef<HTMLFormElement | null>(null);
	const sharingPath = `${path}/share-link`;

	function issueLink() {
		const expires_at = utcInput(expiry);
		if (!expires_at || Date.parse(expires_at) <= Date.now()) {
			setMessage("Выберите срок действия в будущем.");
			return;
		}
		setConfirm(null);
		setMessage("");
		void run(async (signal) => {
			const key =
				issue.current?.expiry === expires_at
					? issue.current.key
					: crypto.randomUUID();
			issue.current = { expiry: expires_at, key };
			const result = parseResponse(
				issuedLinkSchema,
				await http.request(sharingPath, {
					method: "POST",
					body: { expires_at },
					idempotencyKey: key,
					privacy: true,
					signal,
				}),
			);
			issue.current = null;
			setIssued(result);
			await refresh();
		});
	}
	function revoke() {
		setConfirm(null);
		setMessage("");
		void run(async (signal) => {
			await http.request(sharingPath, { method: "DELETE", signal });
			setIssued(null);
			issue.current = null;
			await refresh();
		});
	}
	function upload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		if (
			!data.get("previous_document_id") ||
			data.get("previous_document_id") === "new"
		)
			data.delete("previous_document_id");
		void run(async (signal) => {
			await http.request(`${path}/documents`, {
				method: "POST",
				body: data,
				signal,
			});
			uploadForm.current?.reset();
			await refresh();
		});
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
		<>
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
						else issueLink();
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
							confirm === "revoke"
								? "Отозвать ссылку?"
								: "Перевыпустить ссылку?"
						}
						onClose={() => setConfirm(null)}
					>
						<p>Текущая ссылка перестанет открывать заказ.</p>
						<div className={styles.row}>
							<Button onClick={confirm === "revoke" ? revoke : issueLink}>
								Подтвердить
							</Button>
							<Button variant="secondary" onClick={() => setConfirm(null)}>
								Отмена
							</Button>
						</div>
					</Modal>
				)}
			</section>
			<section className={styles.panel}>
				<h2>Документы заказа</h2>
				<form ref={uploadForm} onSubmit={upload} className={styles.row}>
					<Field label="Название">
						<Input required name="name" />
					</Field>
					<div>
						<span>Категория</span>
						<Combobox
							aria-label="Категория"
							name="category"
							required
							defaultValue="specification"
							options={Object.entries(categories).map(([value, label]) => ({
								value,
								label,
							}))}
						/>
					</div>
					<div>
						<span>Заменить версию</span>
						<Combobox
							aria-label="Заменить версию"
							name="previous_document_id"
							defaultValue="new"
							placeholder="Новый документ"
							options={[
								{ value: "new", label: "Новый документ" },
								...shipment.documents.map(({ id, name, version }) => ({
									value: id,
									label: `${name} · v${version}`,
								})),
							]}
						/>
					</div>
					<Field label="Файл">
						<Input required type="file" name="file" />
					</Field>
					<Button type="submit" disabled={busy}>
						Загрузить документ
					</Button>
				</form>
				{shipment.documents.length ? (
					<div className={styles.scroll}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>Документ</th>
									<th>Категория</th>
									<th>Версия</th>
									<th>Загружен</th>
									<th>Видимость</th>
									<th>Действие</th>
								</tr>
							</thead>
							<tbody>
								{shipment.documents.map((row) => (
									<tr key={row.id}>
										<th scope="row">{row.name}</th>
										<td>{categories[row.category]}</td>
										<td>{row.version}</td>
										<td>
											{formatMoment(row.uploaded_at, shipment.order.time_zone)}
										</td>
										<td>{row.published ? "Опубликован" : "Скрыт"}</td>
										<td>
											<Button
												variant="secondary"
												size="sm"
												disabled={busy}
												onClick={() =>
													void run(async (signal) => {
														await http.request(
															`${path}/documents/${encodeURIComponent(row.id)}`,
															{
																method: "PATCH",
																body: { published: !row.published },
																signal,
															},
														);
														await refresh();
													})
												}
											>
												{row.published ? "Снять с публикации" : "Опубликовать"}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p>Документы ещё не загружены.</p>
				)}
			</section>
		</>
	);
}
