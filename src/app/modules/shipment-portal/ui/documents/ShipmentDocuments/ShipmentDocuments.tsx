import type { Shipment } from "@/domain/shipment";
import { Feedback } from "@/shared/ui/feedback";

import type { DownloadGuestDocument } from "../../../api/guestShipmentApi";
import { useGuestDocumentDownload } from "../../../model/documents/useGuestDocumentDownload";
import { DocumentRow } from "../DocumentRow/DocumentRow";

import styles from "../../../shared.module.css";

export function ShipmentDocuments({
	documents,
	timeZone,
	token,
	onAccessDenied,
	downloadFile,
}: {
	documents: Shipment["documents"];
	timeZone: Shipment["order"]["time_zone"];
	token: string;
	onAccessDenied: () => void;
	downloadFile: DownloadGuestDocument;
}) {
	const model = useGuestDocumentDownload(token, downloadFile, onAccessDenied);
	const isPending = model.pendingDocumentId !== null;

	return (
		<section className={styles.panel}>
			<h2>Документы</h2>
			{model.error && <Feedback tone="warning">{model.error}</Feedback>}
			{documents.length ? (
				<section
					className={styles.scroll}
					aria-label="Таблица документов"
					tabIndex={0}
				>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Название</th>
								<th>Категория</th>
								<th>Загружен</th>
								<th>Версия</th>
								<th data-column="actions">Действие</th>
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
				</section>
			) : (
				<p>Опубликованных документов пока нет.</p>
			)}
		</section>
	);
}
