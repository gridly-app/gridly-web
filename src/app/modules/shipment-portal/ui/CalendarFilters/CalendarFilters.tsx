import type { ChangeEvent } from "react";
import { transports } from "@/domain/shipment";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";
import type { CalendarFilters as CalendarFilterValues } from "../../model/shipmentCalendar";
import type { CalendarItem } from "../../model/shipmentCalendarView";

import styles from "../../shared.module.css";

export function CalendarFilters({
	filters,
	onChange,
	items,
}: {
	filters: CalendarFilterValues;
	onChange: (filters: CalendarFilterValues) => void;
	items: CalendarItem[];
}) {
	const groupingValue = filters.weekly ? "week" : "day";
	const itemValue = filters.item === null ? "all" : `item:${filters.item}`;
	const transportValue = filters.transport || "all";
	const itemOptions = [
		{ value: "all", label: "Все позиции" },
		...items.map((item) => ({
			value: `item:${item.order_line_id}`,
			label: item.sku ? `${item.sku} · ${item.name}` : item.name,
		})),
	];
	const transportEntries = Object.entries(transports);
	const transportOptions = [
		{ value: "all", label: "Весь транспорт" },
		...transportEntries.map(([value, label]) => ({ value, label })),
	];

	function handleFromChange(event: ChangeEvent<HTMLInputElement>) {
		onChange({ ...filters, from: event.target.value });
	}

	function handleToChange(event: ChangeEvent<HTMLInputElement>) {
		onChange({ ...filters, to: event.target.value });
	}

	function handleGroupingChange(value: string) {
		onChange({ ...filters, weekly: value === "week" });
	}

	function handleItemChange(value: string) {
		const item = value === "all" ? null : value.slice("item:".length);

		onChange({ ...filters, item });
	}

	function handleTransportChange(value: string) {
		const transport = value === "all" ? "" : value;

		onChange({ ...filters, transport });
	}

	return (
		<div className={styles.filters}>
			<Field label="С даты">
				<Input type="date" value={filters.from} onChange={handleFromChange} />
			</Field>
			<Field label="По дату">
				<Input type="date" value={filters.to} onChange={handleToChange} />
			</Field>
			<div>
				<span>Группировка</span>
				<Select
					aria-label="Группировка"
					value={groupingValue}
					onValueChange={handleGroupingChange}
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
					value={itemValue}
					onValueChange={handleItemChange}
					options={itemOptions}
					searchable
				/>
			</div>
			<div>
				<span>Факт по транспорту</span>
				<Select
					aria-label="Факт по транспорту"
					value={transportValue}
					onValueChange={handleTransportChange}
					options={transportOptions}
				/>
			</div>
		</div>
	);
}
