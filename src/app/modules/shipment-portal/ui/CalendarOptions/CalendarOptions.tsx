import type { ChangeEvent } from "react";
import type {
	CalendarColumn,
	CalendarField,
} from "../../model/shipmentCalendarView";

import styles from "../../shared.module.css";

export function CalendarOptions({
	showZeroActual,
	hiddenColumns,
	columns,
	onShowZeroActualChange,
	onColumnChange,
}: {
	showZeroActual: boolean;
	hiddenColumns: CalendarField[];
	columns: readonly CalendarColumn[];
	onShowZeroActualChange: (showZeroActual: boolean) => void;
	onColumnChange: (field: CalendarField, checked: boolean) => void;
}) {
	function handleZeroChange(event: ChangeEvent<HTMLInputElement>) {
		onShowZeroActualChange(event.target.checked);
	}

	return (
		<div className={styles.options}>
			<label>
				<input
					type="checkbox"
					checked={showZeroActual}
					onChange={handleZeroChange}
				/>{" "}
				Показывать ноль при отсутствии факта
			</label>
			<details>
				<summary>Колонки</summary>
				<div className={styles.options}>
					{columns.map(([field, label]) => (
						<ColumnToggle
							key={field}
							field={field}
							label={label}
							checked={!hiddenColumns.includes(field)}
							onChange={onColumnChange}
						/>
					))}
				</div>
			</details>
		</div>
	);
}

function ColumnToggle({
	field,
	label,
	checked,
	onChange,
}: {
	field: CalendarField;
	label: string;
	checked: boolean;
	onChange: (field: CalendarField, checked: boolean) => void;
}) {
	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		onChange(field, event.target.checked);
	}

	return (
		<label>
			<input type="checkbox" checked={checked} onChange={handleChange} />{" "}
			{label}
		</label>
	);
}
