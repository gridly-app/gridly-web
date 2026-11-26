import { useState } from "react";

import { saveFile } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

import {
	shipmentFactCsv,
	shipmentFactSummary,
} from "../../model/shipmentFactExport";

import styles from "../../shared.module.css";

export function ShipmentFactExport({
	shipment,
}: {
	shipment: Parameters<typeof shipmentFactSummary>[0];
}) {
	const [copyStatus, setCopyStatus] = useState<"copied" | "failed" | null>(
		null,
	);

	if (shipment.actual.length === 0) return null;

	async function handleCopy() {
		setCopyStatus(null);

		try {
			await navigator.clipboard.writeText(shipmentFactSummary(shipment));
			setCopyStatus("copied");
		} catch {
			setCopyStatus("failed");
		}
	}

	function handleDownload() {
		const number = shipment.order.number.replace(/[<>:"/\\|?*\p{Cc}]/gu, "_");
		const file = new Blob([shipmentFactCsv(shipment)], {
			type: "text/csv;charset=utf-8",
		});

		saveFile(file, `отгрузка-${number}.csv`);
	}

	return (
		<>
			<p>Сводка и ведомость формируются из сохранённого факта отгрузки.</p>
			<div className={styles.row}>
				<Button type="button" variant="secondary" onClick={handleCopy}>
					Скопировать сводку
				</Button>
				<Button type="button" variant="secondary" onClick={handleDownload}>
					Скачать ведомость CSV
				</Button>
			</div>
			{copyStatus === "copied" && (
				<Feedback tone="success">Сводка скопирована.</Feedback>
			)}
			{copyStatus === "failed" && (
				<Feedback tone="error">
					Не удалось скопировать сводку. Можно скачать ведомость CSV.
				</Feedback>
			)}
		</>
	);
}
