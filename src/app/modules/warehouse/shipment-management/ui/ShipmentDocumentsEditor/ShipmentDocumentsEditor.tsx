import { type FormEvent, useId, useRef } from "react";

import { categories } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Combobox, Field } from "@/shared/ui/forms";

import type { ShipmentResource } from "../../api/useShipmentResource";
import type { WorkingShipment } from "../../model/shipment.dto.ts";
import type { RunShipmentAction } from "../../model/useShipmentActions";

import { documentAccept } from "../../model/shipmentDocument";
import { ShipmentDocumentList } from "../ShipmentDocumentList/ShipmentDocumentList";

import styles from "../../shared.module.css";

const newDocument = { value: "new", label: "Новый документ" };
const categoryEntries = Object.entries(categories);
const documentCategories = categoryEntries.map(([value, label]) => ({
	value,
	label,
}));

export function ShipmentDocumentsEditor({
	documents,
	timeZone,
	uploadDocument,
	publishDocument,
	downloadDocument,
	retryUpload,
	creationBlocked,
	canRetryUpload,
	hasUploadFile,
	run,
	busy,
}: {
	documents: WorkingShipment["documents"];
	timeZone: WorkingShipment["order"]["time_zone"];
	uploadDocument: ShipmentResource["uploadDocument"];
	publishDocument: ShipmentResource["publishDocument"];
	downloadDocument: ShipmentResource["downloadDocument"];
	retryUpload: ShipmentResource["retryUpload"];
	creationBlocked: boolean;
	canRetryUpload: boolean;
	hasUploadFile: boolean;
	run: RunShipmentAction;
	busy: boolean;
}) {
	const uploadForm = useRef<HTMLFormElement>(null);
	const limitsId = useId();
	const isUploadBlocked = busy || creationBlocked;
	const retryLabel = hasUploadFile
		? "Проверить и повторить загрузку"
		: "Проверить загрузку";
	const versionOptions = [newDocument];

	for (const { id, name, version, is_latest: isLatest } of documents) {
		if (isLatest !== true) continue;

		versionOptions.push({ value: id, label: `${name}, версия ${version}` });
	}

	function handleUpload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const data = new FormData(event.currentTarget);
		const previousId = data.get("previous_document_id");

		if (!previousId || previousId === newDocument.value) {
			data.delete("previous_document_id");
		}

		submitUpload((signal) => uploadDocument(data, signal));
	}

	function submitUpload(upload: (signal: AbortSignal) => Promise<void>) {
		void run(
			async (signal) => {
				await upload(signal);
				uploadForm.current?.reset();
			},
			{ refreshAfterWrite: true },
		);
	}

	function handlePublish(id: string, published: boolean) {
		void run((signal) => publishDocument(id, published, signal), {
			refreshAfterWrite: true,
		});
	}

	function handleRetryUpload() {
		submitUpload(retryUpload);
	}

	function handleDownload(id: string, name: string) {
		void run((signal) => downloadDocument(id, name, signal), {
			showSuccess: false,
		});
	}

	return (
		<section className={styles.panel}>
			<h2>Документы заказа</h2>
			<form ref={uploadForm} onSubmit={handleUpload} className={styles.row}>
				<fieldset disabled={isUploadBlocked} className={styles.fields}>
					<legend>Загрузка документа</legend>
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
							options={documentCategories}
						/>
					</div>
					<div>
						<span>Заменить версию</span>
						<Combobox
							aria-label="Заменить версию"
							name="previous_document_id"
							defaultValue={newDocument.value}
							placeholder={newDocument.label}
							options={versionOptions}
						/>
					</div>
					<Field label="Файл">
						<Input
							required
							type="file"
							name="file"
							accept={documentAccept}
							aria-describedby={limitsId}
						/>
					</Field>
					<p id={limitsId}>
						PDF, PNG, JPEG, XLSX, DOCX и CSV. До 20 МиБ на файл и 100 версий на
						заказ.
					</p>
					<Button type="submit">Загрузить документ</Button>
				</fieldset>
			</form>
			{canRetryUpload && (
				<Button variant="secondary" disabled={busy} onClick={handleRetryUpload}>
					{retryLabel}
				</Button>
			)}
			<ShipmentDocumentList
				documents={documents}
				timeZone={timeZone}
				busy={busy}
				onDownload={handleDownload}
				onPublish={handlePublish}
			/>
		</section>
	);
}
