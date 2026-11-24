import { formatUnit } from "@/domain/shipment";
import { Button } from "@/shared/ui/controls";
import { Modal } from "@/shared/ui/overlays";
import type { ShipmentCalendarOptions } from "../../model/shipmentCalendarView";
import { useShipmentCalendar } from "../../model/useShipmentCalendar";
import { CalendarFilters } from "../CalendarFilters/CalendarFilters";
import { CalendarOptions } from "../CalendarOptions/CalendarOptions";
import { CalendarTable } from "../CalendarTable/CalendarTable";
import { FactDetails } from "../FactDetails/FactDetails";
import { ActualAmount } from "../ActualAmount/ActualAmount";

import styles from "../../shared.module.css";

export function ShipmentCalendar(props: ShipmentCalendarOptions) {
	const model = useShipmentCalendar(props);
	const hasRows = model.rows.length > 0;
	const isEmpty = !hasRows && !model.hasInvalidDates;

	return (
		<section className={styles.panel}>
			<div className={styles.heading}>
				<h2>План и факт отгрузок</h2>
				<Button variant="default" onClick={model.exportCsv} disabled={!hasRows}>
					Скачать CSV
				</Button>
			</div>
			<CalendarFilters
				filters={model.filters}
				onChange={model.setFilters}
				items={props.items}
			/>
			<CalendarOptions
				showZeroActual={model.showZeroActual}
				hiddenColumns={model.hiddenColumns}
				columns={model.configurableColumns}
				onShowZeroActualChange={model.setShowZeroActual}
				onColumnChange={model.changeColumn}
			/>
			{model.hasInvalidDates && (
				<p role="alert">Начало периода не должно быть позже окончания.</p>
			)}
			{hasRows && (
				<CalendarTable
					rows={model.rows}
					columns={model.visibleColumns}
					sort={model.sort}
					showZeroActual={model.showZeroActual}
					onSort={model.changeSort}
					onSelect={model.selectRow}
				/>
			)}
			{isEmpty && <p>За выбранный период данных об отгрузках нет.</p>}
			{model.totals.length > 0 && (
				<ul className={styles.totals} aria-label="Итоги по единицам">
					{model.totals.map((total) => (
						<CalendarTotal
							key={total.unit}
							total={total}
							showZeroActual={model.showZeroActual}
							onSelect={model.selectTotal}
						/>
					))}
				</ul>
			)}
			{model.detail && (
				<Modal wide title={model.detail.title} onClose={model.closeDetail}>
					<FactDetails
						items={props.items}
						timeZone={props.shipment.order.time_zone}
						facts={model.detail.facts}
					/>
				</Modal>
			)}
		</section>
	);
}

function CalendarTotal({
	total,
	showZeroActual,
	onSelect,
}: {
	total: { unit: string; plan: number | null; actual: number };
	showZeroActual: boolean;
	onSelect: (unit: string) => void;
}) {
	const unitLabel = formatUnit(total.unit);
	const factLabel = `Весь факт, ${unitLabel}`;

	function handleSelect() {
		onSelect(total.unit);
	}

	return (
		<li>
			<strong>{unitLabel}</strong> · План {total.plan ?? "—"} · Факт{" "}
			<ActualAmount
				quantity={total.actual}
				showZeroActual={showZeroActual}
				label={factLabel}
				onClick={handleSelect}
			/>
		</li>
	);
}
