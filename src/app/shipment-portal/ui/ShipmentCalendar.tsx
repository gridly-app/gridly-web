import { useId, useState } from "react";
import {
	type Actual,
	formatMoment,
	formatUnit,
	priorities,
	type Shipment,
	transports,
} from "@/domain/shipment";
import { saveFile } from "@/shared/http";
import { Button, Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";
import {
	shipmentCalendar,
	shipmentCsv,
	transportSummary,
} from "../model/shipmentCalendar";
import styles from "../ShipmentPortal.module.css";

const columns = [
	["date", "Дата"],
	["number", "Заказ"],
	["item", "Номенклатура"],
	["priority", "Приоритет"],
	["unit", "Единица"],
	["plan", "План"],
	["actual", "Факт"],
	["remaining", "Остаток"],
	["transport", "Перевозка"],
	["status", "Статус"],
] as const;

const collator = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
});

export function ShipmentCalendar({
	shipment,
	items: availableItems,
	showPriority,
}: {
	shipment: Shipment;
	items: Pick<Shipment["items"][number], "order_line_id" | "name" | "sku">[];
	showPriority: boolean;
}) {
	const captionId = useId();
	const [filters, setFilters] = useState({
		from: "",
		to: "",
		item: "",
		transport: "",
		weekly: false,
	});
	const [zero, setZero] = useState(true);
	const [hidden, setHidden] = useState<string[]>([]);
	const [sort, setSort] = useState<{
		field: (typeof columns)[number][0];
		ascending: boolean;
	}>({ field: "date", ascending: true });
	const [selection, setSelection] = useState<string | null>(null);
	const items = new Map(
		availableItems.map((item) => [item.order_line_id, item]),
	);
	const labels = {
		active: "В исполнении",
		on_hold: "Приостановлен",
		cancelled: "Отменён",
		delivered: "Доставлен",
	};
	const rows = shipmentCalendar(shipment, filters)
		.map((row) => ({
			...row,
			cells: {
				date: row.date,
				number: shipment.order.number,
				item: [...row.items].map((id) => items.get(id)?.name ?? id).join(", "),
				priority: shipment.warehouse.priority
					? priorities[shipment.warehouse.priority]
					: "Не указан",
				unit: formatUnit(row.unit),
				plan: row.plan,
				actual: row.actual,
				remaining:
					row.plan === null ? null : Math.max(0, row.plan - row.actual),
				transport: transportSummary(row.facts),
				status: labels[shipment.order.state],
			},
		}))
		.sort((left, right) => {
			const a = left.cells[sort.field];
			const b = right.cells[sort.field];
			const difference =
				typeof a === "number" && typeof b === "number"
					? a - b
					: collator.compare(String(a ?? ""), String(b ?? ""));
			return sort.ascending ? difference : -difference;
		});
	const availableColumns = columns.filter(
		([field]) => field !== "priority" || showPriority,
	);
	const visible = availableColumns.filter(([field]) => !hidden.includes(field));
	const selected = rows.find((row) => row.key === selection);
	const totals = new Map<string, { plan: number | null; actual: number }>();
	for (const row of rows) {
		const total = totals.get(row.unit) ?? { plan: null, actual: 0 };
		if (row.plan !== null) total.plan = (total.plan ?? 0) + row.plan;
		total.actual += row.actual;
		totals.set(row.unit, total);
	}
	const invalidDates =
		!!filters.from && !!filters.to && filters.from > filters.to;
	function exportCsv() {
		const csv = shipmentCsv(
			visible.map(([, label]) => label),
			rows.map(({ cells }) => visible.map(([field]) => cells[field])),
		);
		saveFile(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
			"gridly-shipments.csv",
		);
	}
	return (
		<section className={styles.panel}>
			<div className={styles.heading}>
				<h2>План и факт отгрузок</h2>
				<Button variant="default" onClick={exportCsv} disabled={!rows.length}>
					Скачать CSV
				</Button>
			</div>
			<div className={styles.filters}>
				<Field label="С даты">
					<Input
						type="date"
						value={filters.from}
						onChange={(event) =>
							setFilters({ ...filters, from: event.target.value })
						}
					/>
				</Field>
				<Field label="По дату">
					<Input
						type="date"
						value={filters.to}
						onChange={(event) =>
							setFilters({ ...filters, to: event.target.value })
						}
					/>
				</Field>
				<div>
					<span>Группировка</span>
					<Select
						aria-label="Группировка"
						value={filters.weekly ? "week" : "day"}
						onValueChange={(value) =>
							setFilters({ ...filters, weekly: value === "week" })
						}
						options={[
							{ value: "day", label: "По дням" },
							{ value: "week", label: "По неделям" },
						]}
					/>
				</div>
				<div>
					<span>Номенклатура</span>
					<Select
						aria-label="Номенклатура"
						value={filters.item || "all"}
						onValueChange={(value) =>
							setFilters({ ...filters, item: value === "all" ? "" : value })
						}
						options={[
							{ value: "all", label: "Все позиции" },
							...availableItems.map((item) => ({
								value: item.order_line_id,
								label: item.sku ? `${item.sku} · ${item.name}` : item.name,
							})),
						]}
						searchable
					/>
				</div>
				<div>
					<span>Факт по транспорту</span>
					<Select
						aria-label="Факт по транспорту"
						value={filters.transport || "all"}
						onValueChange={(value) =>
							setFilters({
								...filters,
								transport: value === "all" ? "" : value,
							})
						}
						options={[
							{ value: "all", label: "Весь транспорт" },
							...Object.entries(transports).map(([value, label]) => ({
								value,
								label,
							})),
						]}
					/>
				</div>
			</div>
			<div className={styles.options}>
				<label>
					<input
						type="checkbox"
						checked={zero}
						onChange={(event) => setZero(event.target.checked)}
					/>{" "}
					Показывать ноль при отсутствии факта
				</label>
				<details>
					<summary>Колонки</summary>
					<div className={styles.options}>
						{availableColumns
							.filter(([field]) => field !== "date" && field !== "actual")
							.map(([field, label]) => (
								<label key={field}>
									<input
										type="checkbox"
										checked={!hidden.includes(field)}
										onChange={(event) => {
											setHidden(
												event.target.checked
													? hidden.filter((name) => name !== field)
													: [...hidden, field],
											);
											if (!event.target.checked && sort.field === field)
												setSort({ field: "date", ascending: true });
										}}
									/>{" "}
									{label}
								</label>
							))}
					</div>
				</details>
			</div>
			{invalidDates && (
				<p role="alert">Начало периода должно быть раньше окончания.</p>
			)}
			{rows.length ? (
				<section
					className={styles.scroll}
					aria-labelledby={captionId}
					// Make the wide table scrollable with the keyboard.
					tabIndex={0}
				>
					<table className={styles.table}>
						<caption id={captionId}>Таблица плана и факта</caption>
						<thead>
							<tr>
								{visible.map(([field, label]) => (
									<th
										key={field}
										scope="col"
										aria-sort={
											sort.field === field
												? sort.ascending
													? "ascending"
													: "descending"
												: undefined
										}
									>
										<Button
											variant="ghost"
											size="sm"
											type="button"
											onClick={() =>
												setSort({
													field,
													ascending:
														sort.field === field ? !sort.ascending : true,
												})
											}
										>
											{field === "date" && filters.weekly ? "Неделя с" : label}
											{sort.field === field && (
												<span aria-hidden="true">
													{sort.ascending ? " ↑" : " ↓"}
												</span>
											)}
										</Button>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map(({ key, cells, facts }) => (
								<tr key={key}>
									{visible.map(([field]) => (
										<td key={field}>
											{field === "actual" ? (
												facts.length ? (
													<Button
														size="sm"
														variant="text"
														aria-label={`Факт за ${cells.date}, ${cells.unit}`}
														onClick={() => setSelection(key)}
													>
														{cells.actual}
													</Button>
												) : zero ? (
													0
												) : (
													"Нет отгрузки"
												)
											) : field === "plan" ? (
												(cells.plan ?? "Не запланировано")
											) : (
												(cells[field] ?? "—")
											)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</section>
			) : (
				!invalidDates && <p>За выбранный период данных об отгрузках нет.</p>
			)}
			{totals.size > 0 && (
				<ul className={styles.totals} aria-label="Итоги по единицам">
					{[...totals].map(([unit, total]) => (
						<li key={unit}>
							<strong>{formatUnit(unit)}</strong> · План {total.plan ?? "—"} ·
							Факт{" "}
							{total.actual > 0 ? (
								<Button
									size="sm"
									variant="text"
									aria-label={`Весь факт, ${formatUnit(unit)}`}
									onClick={() => setSelection(`total:${unit}`)}
								>
									{total.actual}
								</Button>
							) : zero ? (
								0
							) : (
								"Нет отгрузки"
							)}
						</li>
					))}
				</ul>
			)}
			{(selected || selection?.startsWith("total:")) && (
				<Modal
					wide
					title={
						selected
							? `Факт отгрузки · ${selected.date}`
							: "Факт за выбранный период"
					}
					onClose={() => setSelection(null)}
				>
					<FactDetails
						shipment={shipment}
						facts={
							selected?.facts ??
							rows
								.filter((row) => `total:${row.unit}` === selection)
								.flatMap((row) => row.facts)
						}
					/>
				</Modal>
			)}
		</section>
	);
}

function FactDetails({
	shipment,
	facts,
}: {
	shipment: Shipment;
	facts: Actual[];
}) {
	return (
		<div className={styles.scroll}>
			<table className={styles.table}>
				<thead>
					<tr>
						<th>Позиция</th>
						<th>Количество</th>
						<th>Упаковка</th>
						<th>Отгрузка / погрузка</th>
						<th>Перевозка</th>
						<th>Вагон / автомобиль</th>
						<th>Рейс / накладная</th>
						<th>Комментарий</th>
					</tr>
				</thead>
				<tbody>
					{facts.map((fact) => {
						const item = shipment.items.find(
							(row) => row.order_line_id === fact.order_line_id,
						);
						return (
							<tr key={fact.id}>
								<th scope="row">
									{item
										? [item.sku, item.name, item.grade]
												.filter(Boolean)
												.join(" · ")
										: "Не указана"}
								</th>
								<td>
									{fact.quantity} {formatUnit(fact.unit)}
								</td>
								<td>{fact.packaging ?? "Не указана"}</td>
								<td>
									{formatMoment(fact.shipped_at, shipment.order.time_zone)} /{" "}
									{formatMoment(fact.loaded_at, shipment.order.time_zone)}
								</td>
								<td>{transports[fact.transport_type]}</td>
								<td>{fact.vehicle_number ?? "Не указан"}</td>
								<td>{fact.reference_number ?? "Не указан"}</td>
								<td>{fact.comment ?? "Не указан"}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
