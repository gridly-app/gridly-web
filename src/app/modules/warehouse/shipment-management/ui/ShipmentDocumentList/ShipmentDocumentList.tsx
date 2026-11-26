import { categories } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";

import type { WorkingShipment } from "../../model/shipment.dto";

import styles from "../../shared.module.css";

type DocumentActions = {
	onDownload: (id: string, name: string) => void;
	onPublish: (id: string, published: boolean) => void;
};

export function ShipmentDocumentList({
	documents,
	timeZone,
	busy,
	onDownload,
	onPublish,
}: DocumentActions & {
	documents: WorkingShipment["documents"];
	timeZone: string;
	busy: boolean;
}) {
	if (!documents.length) return <p>Документы ещё не загружены.</p>;

	return (
		<section
			className={styles.scroll}
			aria-label="Список документов заказа"
			tabIndex={0}
		>
			<table className={styles.table} aria-label="Документы заказа">
				<thead>
					<tr>
						<th>Документ</th>
						<th>Категория</th>
						<th>Версия</th>
						<th>Загружен</th>
						<th>Видимость</th>
						<th data-column="actions">Действия</th>
					</tr>
				</thead>
				<tbody>
					{documents.map((document) => (
						<DocumentRow
							key={document.id}
							document={document}
							timeZone={timeZone}
							busy={busy}
							onDownload={onDownload}
							onPublish={onPublish}
						/>
					))}
				</tbody>
			</table>
		</section>
	);
}

function DocumentRow({
	document: row,
	timeZone,
	busy,
	onDownload,
	onPublish,
}: DocumentActions & {
	document: WorkingShipment["documents"][number];
	timeZone: string;
	busy: boolean;
}) {
	const visibility = row.published ? "Опубликован" : "Скрыт";
	const publicationAction = row.published
		? "Снять с публикации"
		: "Опубликовать";
	const downloadLabel = `Скачать ${row.name}, версия ${row.version}`;
	const publicationLabel = `${publicationAction} ${row.name}, версия ${row.version}`;

	function handleDownloadClick() {
		onDownload(row.id, row.name);
	}

	function handlePublicationClick() {
		onPublish(row.id, !row.published);
	}

	return (
		<tr>
			<th scope="row">{row.name}</th>
			<td>{categories[row.category]}</td>
			<td>{row.version}</td>
			<td>{formatMoment(row.uploaded_at, timeZone)}</td>
			<td>{visibility}</td>
			<td>
				<Button
					variant="secondary"
					size="sm"
					disabled={busy}
					aria-label={downloadLabel}
					onClick={handleDownloadClick}
				>
					Скачать
				</Button>
				<Button
					variant="secondary"
					size="sm"
					disabled={busy}
					aria-label={publicationLabel}
					onClick={handlePublicationClick}
				>
					{publicationAction}
				</Button>
			</td>
		</tr>
	);
}
