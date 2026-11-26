import { type ChangeEvent, useId, useState } from "react";

import { saveFile } from "@/shared/http";
import { dateKey, dateRangeError } from "@/shared/lib";
import { Button, Input } from "@/shared/ui/controls";
import {
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableNote,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Field, Select } from "@/shared/ui/forms";

import {
	type ReconciliationRow,
	reconciliationCsv,
	reconciliationStatuses,
	shipmentReconciliation,
} from "../../model/shipmentReconciliation";

import styles from "../../shared.module.css";
import reconciliationStyles from "./ShipmentReconciliation.module.css";

const filters = [
	{ value: "all", label: "Все позиции" },
	{ value: "differences", label: "С расхождениями" },
	{ value: "overdue", label: "С просрочкой" },
];
const statusTones = {
	complete: "success",
	pending: "warning",
	excess: "danger",
	unplanned: "neutral",
} as const;
const quantity = new Intl.NumberFormat("ru-RU", {
	maximumSignificantDigits: 15,
});

export function ShipmentReconciliation({
	shipment,
}: {
	shipment: Parameters<typeof shipmentReconciliation>[0];
}) {
	const headingId = useId();
	const overdueNoteId = useId();
	const [filter, setFilter] = useState("all");
	const [selectedDate, setSelectedDate] = useState("");
	const now = new Date();
	const today =
		dateKey(now.getTime(), shipment.order.time_zone) ??
		now.toISOString().slice(0, 10);
	const dateError = dateRangeError(selectedDate, "");
	const asOf = dateError ? today : selectedDate || today;
	const rows = shipmentReconciliation(shipment, asOf);
	const overdueRows = rows.filter((row) => row.overdue > 0);
	const differences = rows.filter(
		(row) => row.status !== "complete" || row.overdue > 0,
	);
	const visibleRows = new Map([
		["differences", differences],
		["overdue", overdueRows],
	]);
	const displayed = visibleRows.get(filter) ?? rows;
	const hasRows = rows.length > 0;
	const hasDisplayed = displayed.length > 0;

	function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedDate(event.currentTarget.value);
	}

	function handleDownload() {
		const number = shipment.order.number.replace(/[<>:"/\\|?*\p{Cc}]/gu, "_");
		const file = new Blob(
			[reconciliationCsv(shipment.order.number, asOf, differences)],
			{
				type: "text/csv;charset=utf-8",
			},
		);

		saveFile(file, `расхождения-${number}-${asOf}.csv`);
	}

	return (
		<section className={styles.panel} aria-labelledby={headingId}>
			<h2 id={headingId}>Сверка отгрузки</h2>
			{!hasRows && (
				<p>Добавьте и сохраните план или факт отгрузки, чтобы начать сверку.</p>
			)}
			{hasRows && (
				<>
					<p>
						Всего позиций: {rows.length} · С расхождениями: {differences.length}{" "}
						· С просрочкой: {overdueRows.length}
					</p>
					<div className={`${styles.row} ${reconciliationStyles.toolbar}`}>
						<Field
							label="Дата проверки просрочки"
							error={dateError ?? undefined}
						>
							<Input
								type="date"
								value={selectedDate || asOf}
								onChange={handleDateChange}
								aria-describedby={overdueNoteId}
							/>
						</Field>
						<Select
							aria-label="Показать позиции"
							value={filter}
							onValueChange={setFilter}
							options={filters}
						/>
						<Button
							type="button"
							variant="secondary"
							disabled={!differences.length || Boolean(dateError)}
							onClick={handleDownload}
						>
							Скачать расхождения CSV
						</Button>
					</div>
					<p id={overdueNoteId}>
						Просрочка учитывает план до выбранной даты и факт по эту дату
						включительно. План и факт в таблице показаны за весь заказ.
					</p>
					{hasDisplayed && <ReconciliationTable rows={displayed} />}
					{!hasDisplayed && (
						<p role="status">По выбранному фильтру позиций нет.</p>
					)}
				</>
			)}
		</section>
	);
}

function ReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
	return (
		<Table aria-label="План и факт по позициям">
			<TableHeader>
				<TableRow>
					<TableHead>Позиция</TableHead>
					<TableHead>Ед. изм.</TableHead>
					<TableHead>План</TableHead>
					<TableHead>Факт</TableHead>
					<TableHead>К отгрузке</TableHead>
					<TableHead>Сверх плана</TableHead>
					<TableHead>Просрочено</TableHead>
					<TableHead>Статус</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.key}>
						<TableCell>
							{row.name}
							{row.sku && <TableNote>{row.sku}</TableNote>}
						</TableCell>
						<TableCell>{row.unit}</TableCell>
						<TableCell>{quantity.format(row.planned)}</TableCell>
						<TableCell>{quantity.format(row.shipped)}</TableCell>
						<TableCell>{quantity.format(row.remaining)}</TableCell>
						<TableCell>{quantity.format(row.excess)}</TableCell>
						<TableCell>{quantity.format(row.overdue)}</TableCell>
						<TableCell>
							<Badge tone={statusTones[row.status]}>
								{reconciliationStatuses[row.status]}
							</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
