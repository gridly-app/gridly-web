import { type FormEvent, useRef } from "react";

import { categories, formatMoment } from "@/domain/shipment";
import { Button, Input } from "@/shared/ui/controls";
import { Combobox, Field } from "@/shared/ui/forms";

import type { ShipmentResource } from "../../api/useShipmentResource";
import type { WorkingShipment } from "../../model/shipment.dto.ts";
import type { RunShipmentAction } from "../../ShipmentManagement";

import styles from "../../shared.module.css";

export function ShipmentDocumentsEditor({
	documents,
	timeZone,
	uploadDocument,
	publishDocument,
	run,
	busy,
}: {
	documents: WorkingShipment["documents"];
	timeZone: WorkingShipment["order"]["time_zone"];
	uploadDocument: ShipmentResource["uploadDocument"];
	publishDocument: ShipmentResource["publishDocument"];
	run: RunShipmentAction;
	busy: boolean;
}) {
	const uploadForm = useRef<HTMLFormElement>(null);

	function upload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const data = new FormData(event.currentTarget);
		const previousId = data.get("previous_document_id");

		if (!previousId || previousId === "new")
			data.delete("previous_document_id");

		void run(
			async (signal) => {
				await uploadDocument(data, signal);
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

	return (
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
							...documents.map(({ id, name, version }) => ({
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
			{documents.length ? (
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
							{documents.map((row) => (
								<tr key={row.id}>
									<th scope="row">{row.name}</th>
									<td>{categories[row.category]}</td>
									<td>{row.version}</td>
									<td>{formatMoment(row.uploaded_at, timeZone)}</td>
									<td>{row.published ? "Опубликован" : "Скрыт"}</td>
									<td>
										<Button
											variant="secondary"
											size="sm"
											disabled={busy}
											onClick={() => handlePublish(row.id, !row.published)}
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
	);
}
