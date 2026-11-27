import { type ChangeEvent, useId, useState } from "react";

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

import { fileNamePart, saveCsvFile } from "../../lib/csvFile";
import {
	type ReconciliationRow,
	reconciliationCsv,
	reconciliationStatuses,
	shipmentReconciliation,
} from "../../model/shipmentReconciliation";

import styles from "../../shared.module.css";
import reconciliationStyles from "./ShipmentReconciliation.module.css";

type RowFilter = "all" | "differences" | "overdue";

const filterOptions = [
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
const quantityFormat = new Intl.NumberFormat("ru-RU", {
	maximumSignificantDigits: 15,
});

function isRowFilter(value: string): value is RowFilter {
	return filterOptions.some((option) => option.value === value);
}

function todayIn(timeZone: string) {
	const now = new Date();

	return dateKey(now.getTime(), timeZone) ?? now.toISOString().slice(0, 10);
}

export function ShipmentReconciliation({
	shipment,
}: {
	shipment: Parameters<typeof shipmentReconciliation>[0];
}) {
	const headingId = useId();
	const overdueNoteId = useId();
	const [filter, setFilter] = useState<RowFilter>("all");
	const [selectedDate, setSelectedDate] = useState("");
	const today = todayIn(shipment.order.time_zone);
	const dateError = dateRangeError(selectedDate, "");
	const asOf = dateError ? today : selectedDate || today;
	const rows = shipmentReconciliation(shipment, asOf);
	const overdueRows = rows.filter((row) => row.overdue > 0);
	const differences = rows.filter(
		(row) => row.status !== "complete" || row.overdue > 0,
	);
	const rowsByFilter = { all: rows, differences, overdue: overdueRows };
	const displayed = rowsByFilter[filter];
	const canDownload = differences.length > 0 && !dateError;

	function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
		setSelectedDate(event.currentTarget.value);
	}

	function handleFilterChange(value: string) {
		if (isRowFilter(value)) setFilter(value);
	}

	function handleDownload() {
		const { number } = shipment.order;

		saveCsvFile(
			reconciliationCsv(number, asOf, differences),
			`расхождения-${fileNamePart(number)}-${asOf}.csv`,
		);
	}

	if (!rows.length) {
		return (
			<section className={styles.panel} aria-labelledby={headingId}>
				<h2 id={headingId}>Сверка отгрузки</h2>
				<p>Добавьте и сохраните план или факт отгрузки, чтобы начать сверку.</p>
			</section>
		);
	}

	return (
		<section className={styles.panel} aria-labelledby={headingId}>
			<h2 id={headingId}>Сверка отгрузки</h2>
			<p>
				Всего позиций: {rows.length} · С расхождениями: {differences.length} · С
				просрочкой: {overdueRows.length}
			</p>
			<div className={`${styles.row} ${reconciliationStyles.toolbar}`}>
				<Field label="Дата проверки просрочки" error={dateError ?? undefined}>
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
					onValueChange={handleFilterChange}
					options={filterOptions}
				/>
				<Button
					type="button"
					variant="secondary"
					disabled={!canDownload}
					onClick={handleDownload}
				>
					Скачать расхождения CSV
				</Button>
			</div>
			<p id={overdueNoteId}>
				Просрочка учитывает план до выбранной даты и факт по эту дату
				включительно. План и факт в таблице показаны за весь заказ.
			</p>
			{displayed.length > 0 ? (
				<ReconciliationTable rows={displayed} />
			) : (
				<p role="status">По выбранному фильтру позиций нет.</p>
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
						<TableCell>{quantityFormat.format(row.planned)}</TableCell>
						<TableCell>{quantityFormat.format(row.shipped)}</TableCell>
						<TableCell>{quantityFormat.format(row.remaining)}</TableCell>
						<TableCell>{quantityFormat.format(row.excess)}</TableCell>
						<TableCell>{quantityFormat.format(row.overdue)}</TableCell>
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
