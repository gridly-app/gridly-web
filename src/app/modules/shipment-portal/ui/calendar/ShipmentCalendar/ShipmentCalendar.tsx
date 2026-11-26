import { Button } from "@/shared/ui/controls";
import { Modal } from "@/shared/ui/overlays";

import type { ShipmentCalendarOptions } from "../../../model/calendar/shipmentCalendarOptions";
import { useShipmentCalendar } from "../../../model/calendar/useShipmentCalendar";
import { CalendarFilters } from "../CalendarFilters/CalendarFilters";
import { CalendarOptions } from "../CalendarOptions/CalendarOptions";
import { CalendarTable } from "../CalendarTable/CalendarTable";
import { CalendarTotal } from "../CalendarTotal/CalendarTotal";
import { FactDetails } from "../FactDetails/FactDetails";

import styles from "../../../shared.module.css";

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
