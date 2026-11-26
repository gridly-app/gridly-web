import { categories, formatMoment, type Shipment } from "@/domain/shipment";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

import type { DownloadGuestDocument } from "../../../api/guestShipmentApi";
import { useGuestDocumentDownload } from "../../../model/documents/useGuestDocumentDownload";

import styles from "../../../shared.module.css";

export function ShipmentDocuments({
	documents,
	timeZone,
	token,
	refresh,
	downloadFile,
}: {
	documents: Shipment["documents"];
	timeZone: Shipment["order"]["time_zone"];
	token: string;
	refresh: () => void;
	downloadFile: DownloadGuestDocument;
}) {
	const model = useGuestDocumentDownload(token, downloadFile, refresh);
	const isPending = model.pendingDocumentId !== null;

	return (
		<section className={styles.panel}>
			<h2>Документы</h2>
			{model.error && <Feedback tone="warning">{model.error}</Feedback>}
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
								<DocumentRow
									key={document.id}
									document={document}
									timeZone={timeZone}
									isPending={isPending}
									isDownloading={model.pendingDocumentId === document.id}
									onDownload={model.download}
								/>
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

function DocumentRow({
	document,
	timeZone,
	isPending,
	isDownloading,
	onDownload,
}: {
	document: Shipment["documents"][number];
	timeZone: string;
	isPending: boolean;
	isDownloading: boolean;
	onDownload: (id: string, name: string) => Promise<void>;
}) {
	const downloadLabel = `Скачать ${document.name}`;
	const buttonLabel = isDownloading ? "Скачиваем…" : "Скачать";

	function handleDownload() {
		void onDownload(document.id, document.name);
	}

	return (
		<tr>
			<th scope="row">{document.name}</th>
			<td>{categories[document.category]}</td>
			<td>{formatMoment(document.uploaded_at, timeZone)}</td>
			<td>{document.version}</td>
			<td>
				<Button
					variant="default"
					size="sm"
					disabled={isPending}
					aria-label={downloadLabel}
					onClick={handleDownload}
				>
					{buttonLabel}
				</Button>
			</td>
		</tr>
	);
}
