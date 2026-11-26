import { formatUnit } from "@/domain/shipment";

import type { CalendarTotal as CalendarTotalValues } from "../../../model/calendar/calendarTotals";
import { ActualAmount } from "../ActualAmount/ActualAmount";

export function CalendarTotal({
	total,
	showZeroActual,
	onSelect,
}: {
	total: CalendarTotalValues;
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
