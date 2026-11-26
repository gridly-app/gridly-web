import type { ChangeEvent } from "react";

import { transports } from "@/domain/shipment";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import type { CalendarFilters as CalendarFilterValues } from "../../../model/calendar/calendarFilters";
import type { CalendarItem } from "../../../model/calendar/shipmentCalendarOptions";

import styles from "../../../shared.module.css";

const allOption = "all";

const itemPrefix = "item:";

const groupingOptions = [
	{ value: "day", label: "По дням" },
	{ value: "week", label: "По неделям" },
];

const transportOptions = [
	{ value: allOption, label: "Весь транспорт" },
	...Object.entries(transports).map(([value, label]) => ({ value, label })),
];

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
	const itemValue =
		filters.item === null ? allOption : `${itemPrefix}${filters.item}`;
	const transportValue = filters.transport || allOption;
	const itemOptions = [
		{ value: allOption, label: "Все позиции" },
		...items.map((item) => ({
			value: `${itemPrefix}${item.order_line_id}`,
			label: item.sku ? `${item.sku} · ${item.name}` : item.name,
		})),
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
		const item = value === allOption ? null : value.slice(itemPrefix.length);

		onChange({ ...filters, item });
	}

	function handleTransportChange(value: string) {
		const transport = value === allOption ? "" : value;

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
					options={groupingOptions}
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
