import { type FormEvent, useId, useRef } from "react";

import { categories } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Combobox, Field } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto";
import type { ShipmentResource } from "../../api/useShipmentResource";
import {
	documentAccept,
	documentFormatsLabel,
	documentSizeLimitLabel,
	documentVersionLimit,
} from "../../model/shipmentDocument";
import type { RunShipmentAction } from "../../model/useShipmentActions";
import { ShipmentDocumentList } from "../ShipmentDocumentList/ShipmentDocumentList";
import { ShipmentFactExport } from "../ShipmentFactExport/ShipmentFactExport";

import styles from "../../shared.module.css";

const newDocument = { value: "new", label: "Новый документ" };
const categoryOptions = Object.entries(categories).map(([value, label]) => ({
	value,
	label,
}));

function versionOptions(documents: WorkingShipment["documents"]) {
	const latest = documents.filter((document) => document.is_latest === true);

	return [
		newDocument,
		...latest.map(({ id, name, version }) => ({
			value: id,
			label: `${name}, версия ${version}`,
		})),
	];
}

export function ShipmentDocumentsEditor({
	shipment,
	isBusy,
	isCreationBlocked,
	canRetryUpload,
	hasUploadFile,
	run,
	uploadDocument,
	publishDocument,
	downloadDocument,
	retryUpload,
}: {
	shipment: WorkingShipment;
	isBusy: boolean;
	isCreationBlocked: boolean;
	canRetryUpload: boolean;
	hasUploadFile: boolean;
	run: RunShipmentAction;
	uploadDocument: ShipmentResource["uploadDocument"];
	publishDocument: ShipmentResource["publishDocument"];
	downloadDocument: ShipmentResource["downloadDocument"];
	retryUpload: ShipmentResource["retryUpload"];
}) {
	const uploadForm = useRef<HTMLFormElement>(null);
	const headingId = useId();
	const limitsId = useId();
	const { documents, order } = shipment;
	const isUploadBlocked = isBusy || isCreationBlocked;
	const retryLabel = hasUploadFile
		? "Проверить и повторить загрузку"
		: "Проверить загрузку";

	function submitUpload(upload: (signal: AbortSignal) => Promise<void>) {
		void run(
			async (signal) => {
				await upload(signal);
				uploadForm.current?.reset();
			},
			{ refreshAfterWrite: true },
		);
	}

	function handleUpload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const data = new FormData(event.currentTarget);
		const previousId = data.get("previous_document_id");

		if (!previousId || previousId === newDocument.value)
			data.delete("previous_document_id");

		submitUpload((signal) => uploadDocument(data, signal));
	}

	function handleRetryUpload() {
		submitUpload(retryUpload);
	}

	function handlePublish(id: string, published: boolean) {
		void run((signal) => publishDocument(id, published, signal), {
			refreshAfterWrite: true,
		});
	}

	function handleDownload(id: string, name: string) {
		void run((signal) => downloadDocument(id, name, signal), {
			showSuccess: false,
		});
	}

	return (
		<section className={styles.panel} aria-labelledby={headingId}>
			<h2 id={headingId}>Документы заказа</h2>
			<ShipmentFactExport key={shipment.revision} shipment={shipment} />
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
							options={categoryOptions}
						/>
					</div>
					<div>
						<span>Заменить версию</span>
						<Combobox
							aria-label="Заменить версию"
							name="previous_document_id"
							defaultValue={newDocument.value}
							placeholder={newDocument.label}
							options={versionOptions(documents)}
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
						{documentFormatsLabel}. До {documentSizeLimitLabel} на файл и{" "}
						{documentVersionLimit} версий на заказ.
					</p>
					<Button type="submit">Загрузить документ</Button>
				</fieldset>
			</form>
			{canRetryUpload && (
				<Button
					variant="secondary"
					disabled={isBusy}
					onClick={handleRetryUpload}
				>
					{retryLabel}
				</Button>
			)}
			<ShipmentDocumentList
				documents={documents}
				timeZone={order.time_zone}
				isBusy={isBusy}
				onDownload={handleDownload}
				onPublish={handlePublish}
			/>
		</section>
	);
}
