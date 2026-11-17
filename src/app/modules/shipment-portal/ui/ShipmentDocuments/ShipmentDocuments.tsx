import { useEffect, useRef, useState } from "react";

import { categories, formatMoment, type Shipment } from "@/domain/shipment";
import { saveResponseFile } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

import { accessDenied, guestDownload } from "../../model/useGuestShipment";

import styles from "../../shared.module.css";

export function ShipmentDocuments({
	documents,
	timeZone,
	token,
	refresh,
}: {
	documents: Shipment["documents"];
	timeZone: Shipment["order"]["time_zone"];
	token: string;
	refresh: () => void;
}) {
	const [pending, setPending] = useState("");
	const [error, setError] = useState("");
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	async function download(id: string, name: string) {
		if (request.current) return;
		const controller = new AbortController();
		request.current = controller;
		setPending(id);
		setError("");
		try {
			const signal = AbortSignal.any([
				controller.signal,
				AbortSignal.timeout(60000),
			]);
			await saveResponseFile(
				await guestDownload(token, id, signal),
				name,
				signal,
			);
		} catch (reason) {
			if (controller.signal.aborted) return;
			setError(
				accessDenied(reason)
					? "Документ недоступен."
					: "Не удалось скачать документ. Попробуйте ещё раз.",
			);
			if (accessDenied(reason)) refresh();
		} finally {
			request.current = null;
			if (!controller.signal.aborted) setPending("");
		}
	}
	return (
		<section className={styles.panel}>
			<h2>Документы</h2>
			{error && <Feedback tone="warning">{error}</Feedback>}
			{documents.length ? (
				<div className={styles.scroll}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Название</th>
								<th>Категория</th>
								<th>Загружен</th>
								<th>Версия</th>
								<th>Действие</th>
							</tr>
						</thead>
						<tbody>
							{documents.map((document) => (
								<tr key={document.id}>
									<th scope="row">{document.name}</th>
									<td>{categories[document.category]}</td>
									<td>{formatMoment(document.uploaded_at, timeZone)}</td>
									<td>{document.version}</td>
									<td>
										<Button
											variant="default"
											size="sm"
											disabled={!!pending}
											aria-label={`Скачать ${document.name}`}
											onClick={() => void download(document.id, document.name)}
										>
											{pending === document.id ? "Скачиваем…" : "Скачать"}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p>Опубликованных документов пока нет.</p>
			)}
		</section>
	);
}
